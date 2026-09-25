/* eslint-disable @typescript-eslint/no-explicit-any */
import Keyv, { Store } from '@keyvhq/core';
import KeyvFile from '@keyvhq/file';
import KeyvRedis from '@keyvhq/redis';
import * as path from 'node:path';
import {
  expiresIn,
  now,
  since,
  timedDeserialize,
  timedSerialize,
  timingLog,
} from './schedule-timing';

/**
 * If you made some changes to things in the cache that are not
 * backwards compatible, you can bump this version number to
 * invalidate the cache.
 *
 * Ideally you just change the cache key for a specific function,
 * but this is a "global reset" button.
 */
const GLOBAL_CACHE_VERSION = 4;

// Read through and dual write local and remote caches
// v. fast memory cache for local
// not quite as fast redis cache for remote
// but redis is persistent and shared across instances
// on local we still use this code path but "remote" is just a file store
class MultiCache implements Store<any> {
  private remote: Store<any> | Map<string, any>;
  private local: Store<any> | Map<string, any>;

  constructor({
    remote,
    local,
  }: {
    remote: Store<any> | Map<string, any>;
    local: Store<any> | Map<string, any>;
  }) {
    this.remote = remote;
    this.local = local;
  }

  iterator(): AsyncGenerator {
    throw new Error('Method not implemented.');
  }

  async get(key: string) {
    const start = now();
    let res = await this.local.get(key);
    let layer = res === undefined ? 'miss' : 'local';

    if (res === undefined) {
      const data = await this.remote.get(key);

      if (data) {
        res = data;
        layer = 'remote';
        this.local.set(key, data);
      }
    }

    timingLog(
      `cache get key=${key} layer=${layer} expiresIn=${expiresIn(res)} took=${since(start)}`,
    );
    return res;
  }

  async has(key: string) {
    let res = await this.local.has(key);
    if (res === false) {
      res = await this.remote.has(key);
    }
    return res;
  }

  async set(key: string, value: any) {
    const start = now();
    const local = this.local.set(key, value);
    const localDone = now();
    // NB: the file store (local dev) rewrites the whole .kvcache synchronously on every set
    const remote = this.remote.set(key, value);
    const remoteSync = now();
    await Promise.all([local, remote]);
    timingLog(
      `cache set key=${key} bytes=${typeof value === 'string' ? value.length : 'n/a'} ` +
        `local=${(localDone - start).toFixed(1)}ms remoteSync=${(remoteSync - localDone).toFixed(1)}ms ` +
        `total=${since(start)}`,
    );
    return true;
  }

  async delete(key: string) {
    await Promise.all([this.local.delete(key), this.remote.delete(key)]);

    return true;
  }

  async clear() {
    await Promise.all([this.local.clear(), this.remote.clear()]);
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
      local: new Map(),
      remote: redisCacheWithoutTTL,
    });
  } else {
    return new MultiCache({
      local: new Map(),
      remote: new KeyvFile(path.resolve(import.meta.dirname, '../../.kvcache')),
    });
  }
})();

export const getKeyvCache = (namespace: string) => {
  if (process.env.NO_CACHE) return new Keyv();
  const keyv = new Keyv({
    store: dataStore,
    namespace: `cache-v${GLOBAL_CACHE_VERSION}:${namespace}`,
  });
  // TEMPORARY [schedule-timing]: time (de)serialization of cached values
  const timed = keyv as any;
  timed.serialize = timedSerialize(namespace, timed.serialize);
  timed.deserialize = timedDeserialize(namespace, timed.deserialize);
  return keyv;
};
