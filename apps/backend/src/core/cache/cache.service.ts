import { Injectable } from "@nestjs/common";

interface Entry<T> {
  data: T;
  expiresAt: number;
}

const DEFAULT_MAX_SIZE = 5_000;

/**
 * In-process TTL cache with in-flight request de-duplication. Suitable for a
 * single long-lived instance: entries are lost on restart (and rebuilt lazily)
 * and are not shared across instances.
 */
@Injectable()
export class CacheService {
  private readonly store = new Map<string, Entry<unknown>>();
  private readonly inflight = new Map<string, Promise<unknown>>();
  private readonly maxSize = DEFAULT_MAX_SIZE;

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    if (!this.store.has(key) && this.store.size >= this.maxSize) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
    this.inflight.clear();
  }

  size(): number {
    return this.store.size;
  }

  async getOrFetch<T>(
    key: string,
    ttlMs: number,
    fetch: () => Promise<T>
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;

    const existing = this.inflight.get(key);
    if (existing) return existing as Promise<T>;

    const promise = (async () => {
      try {
        const data = await fetch();
        this.set(key, data, ttlMs);
        return data;
      } finally {
        this.inflight.delete(key);
      }
    })();

    this.inflight.set(key, promise);
    return promise;
  }
}
