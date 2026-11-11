/**
 * Small in-process TTL cache for external API metadata.
 *
 * Drive/GitHub calls are only made on demand (opening a document, loading the
 * integrations card) — never at startup. The cache keeps repeated UI actions
 * from spending quota, and is intentionally per-process: a cold start simply
 * misses and refetches.
 */

type Entry = { value: unknown; expiresAt: number };

const store = new Map<string, Entry>();

export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) return hit.value as T;

  const value = await loader();
  store.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
