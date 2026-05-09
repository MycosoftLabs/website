type CacheEntry<T> = {
  value: T
  expiresAt: number
}

export class TtlCache<T> {
  private entries = new Map<string, CacheEntry<T>>()

  constructor(
    private readonly maxEntries = 256,
    private readonly defaultTtlMs = 60_000
  ) {}

  get(key: string): T | null {
    const entry = this.entries.get(key)
    if (!entry) return null
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key)
      return null
    }
    return entry.value
  }

  set(key: string, value: T, ttlMs = this.defaultTtlMs): void {
    this.entries.set(key, { value, expiresAt: Date.now() + ttlMs })
    if (this.entries.size <= this.maxEntries) return
    const overflow = this.entries.size - this.maxEntries
    let removed = 0
    for (const oldKey of this.entries.keys()) {
      this.entries.delete(oldKey)
      removed += 1
      if (removed >= overflow) break
    }
  }
}

export function roundedNumber(value: unknown, digits = 4): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  const scale = 10 ** digits
  return Math.round(n * scale) / scale
}
