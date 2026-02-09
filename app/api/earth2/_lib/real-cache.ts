type CacheEntry = {
  body: unknown;
  status: number;
  expiresAt: number;
  headers?: Record<string, string>;
};

type CacheStore = Map<string, CacheEntry>;

declare global {
  // eslint-disable-next-line no-var
  var __earth2RealCache: CacheStore | undefined;
}

function getStore(): CacheStore {
  if (!global.__earth2RealCache) global.__earth2RealCache = new Map<string, CacheEntry>();
  return global.__earth2RealCache;
}

export function getCachedReal(key: string): CacheEntry | null {
  const store = getStore();
  const item = store.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    store.delete(key);
    return null;
  }
  return item;
}

export function setCachedReal(
  key: string,
  body: unknown,
  options?: { ttlMs?: number; status?: number; headers?: Record<string, string> },
): void {
  const ttlMs = options?.ttlMs ?? 5 * 60 * 1000;
  const status = options?.status ?? 200;
  getStore().set(key, {
    body,
    status,
    headers: options?.headers,
    expiresAt: Date.now() + ttlMs,
  });
}

export function normalizeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

