/* eslint-disable @typescript-eslint/no-explicit-any */
import Keyv, { Store } from '@keyvhq/core';
import KeyvFile from '@keyvhq/file';
import KeyvRedis from '@keyvhq/redis';
import * as path from 'node:path';

/**
 * If you made some changes to things in the cache that are not
 * backwards compatible, you can bump this version number to
 * invalidate the cache.
 *
 * Ideally you just change the cache key for a specific function,
 * but this is a "global reset" button.
 */
const GLOBAL_CACHE_VERSION = 4;

// The local memory cache is bounded so that traffic hitting many distinct keys
// (e.g. crawlers walking /pr/:number, /build/:id, /release/:version) can't grow
// it without limit and OOM the process. memoize reads via store.get directly,
// bypassing Keyv's expiry-eviction, so without this an entry fetched once would
// live forever regardless of its TTL.
const LOCAL_CACHE_MAX_ENTRIES = 5_000;
// Hard ceiling so one-off keys still expire by time even if never re-read.
const LOCAL_CACHE_MAX_TTL_MS = 60 * 60 * 1_000;

// LRU + TTL bounded store. Map preserves insertion order, so the first key is
// the least-recently-used; touching a key on read re-inserts it as newest.
export class BoundedCache<V> {
  private entries = new Map<string, { value: V; expiresAt: number }>();

  constructor(private maxEntries: number) {}

  get(key: string): V | undefined {
    const entry = this.entries.get(key);
    if (entry === undefined) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }
    // Mark as most-recently-used.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  set(key: string, value: V, ttl?: number): void {
    const expiresAt =
      Date.now() +
      Math.min(typeof ttl === 'number' ? ttl : LOCAL_CACHE_MAX_TTL_MS, LOCAL_CACHE_MAX_TTL_MS);
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }

  delete(key: string): boolean {
    return this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }
}

// Read through and dual write local and remote caches
// v. fast memory cache for local
// not quite as fast redis cache for remote
// but redis is persistent and shared across instances
// on local we still use this code path but "remote" is just a file store
class MultiCache implements Store<any> {
  private remote: Store<any> | Map<string, any>;
  private local: BoundedCache<any>;

  constructor({
    remote,
    local,
  }: {
    remote: Store<any> | Map<string, any>;
    local: BoundedCache<any>;
  }) {
    this.remote = remote;
    this.local = local;
  }

  iterator(): AsyncGenerator {
    throw new Error('Method not implemented.');
  }

  async get(key: string) {
    let res = this.local.get(key);

    if (res === undefined) {
      const data = await this.remote.get(key);

      if (data) {
        res = data;
        this.local.set(key, data);
      }
    }

    return res;
  }

  async has(key: string) {
    return this.local.has(key) || (await this.remote.has(key));
  }

  async set(key: string, value: any, ttl?: number) {
    this.local.set(key, value, ttl);
    await this.remote.set(key, value);
    return true;
  }

  async delete(key: string) {
    this.local.delete(key);
    await this.remote.delete(key);
    return true;
  }

  async clear() {
    this.local.clear();
    await this.remote.clear();
  }
}

const dataStore = (() => {
  if (process.env.REDIS_URL) {
    const redisCache = new KeyvRedis(
      process.env.REDIS_URL,
      process.env.REDIS_URL.startsWith('rediss://')
        ? {
            tls: {
              rejectUnauthorized: false,
            },
          }
        : {},
    );
    const redisCacheWithoutTTL = {
      get: async (key: string) => {
        const value = (await redisCache.get(key)) as string;
        return value ? JSON.parse(value) : undefined;
      },
      has: (key: string) => {
        return redisCache.has(key);
      },

      // Trash the TTL as we want to return expired values
      // so that memoize can use stale values
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      set: (key: string, value: any, _ttl?: number) => {
        return redisCache.set(key, value);
      },
      delete: (key: string) => {
        return redisCache.delete(key);
      },
      clear: () => {
        return redisCache.clear();
      },
      iterator: () => {
        return redisCache.iterator();
      },
    };
    return new MultiCache({
      local: new BoundedCache(LOCAL_CACHE_MAX_ENTRIES),
      remote: redisCacheWithoutTTL,
    });
  } else {
    return new MultiCache({
      local: new BoundedCache(LOCAL_CACHE_MAX_ENTRIES),
      remote: new KeyvFile(path.resolve(import.meta.dirname, '../../.kvcache')),
    });
  }
})();

export const getKeyvCache = (namespace: string) =>
  process.env.NO_CACHE
    ? new Keyv()
    : new Keyv({
        store: dataStore,
        namespace: `cache-v${GLOBAL_CACHE_VERSION}:${namespace}`,
      });
