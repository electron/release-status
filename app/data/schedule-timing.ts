// TEMPORARY: [schedule-timing] debug logging for #303. Remove before merge.
// Offsets (@) are ms since process start, so overlapping work lines up across log lines.

export const now = () => performance.now();

const fmt = (ms: number) => `${ms.toFixed(1)}ms`;

export const timingLog = (message: string) => {
  console.log(`[schedule-timing] @${now().toFixed(0)} ${message}`);
};

export const since = (start: number) => fmt(now() - start);

// When each Chromium milestone's schedule was last fetched over the network, to tell
// network lookups from cached ones
export const milestoneFetchedAt = new Map<number, number>();

// Serialize/deserialize wrappers for Keyv, to time (de)serialization of cached values
export const timedSerialize =
  (namespace: string, serialize: (data: unknown) => string) => (data: unknown) => {
    const start = now();
    const result = serialize(data);
    timingLog(`keyv serialize ns=${namespace} bytes=${result.length} took=${since(start)}`);
    return result;
  };

export const timedDeserialize =
  (namespace: string, deserialize: (raw: string) => unknown) => (raw: string) => {
    const start = now();
    const result = deserialize(raw);
    timingLog(`keyv deserialize ns=${namespace} bytes=${raw.length} took=${since(start)}`);
    return result;
  };

// Remaining TTL of a raw cached value ({ value, expires } serialized by Keyv), without parsing
// it. Negative means expired, which memoize still serves (stale) while refreshing in background
export const expiresIn = (raw: unknown) => {
  if (typeof raw !== 'string') return 'n/a';
  const match = /"expires":(\d+)\}$/.exec(raw.slice(-40));
  return match ? fmt(Number(match[1]) - Date.now()) : 'none';
};
