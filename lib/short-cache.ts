/** Small, process-local aggregate cache. Concurrent misses share one query; failures are evicted. */
export function shortCache<T>(ttlMs: number, maxEntries = 100) {
  const entries = new Map<string, {expires:number; pending:Promise<T>}>();
  return (key: string, loader: () => Promise<T>): Promise<T> => {
    const hit = entries.get(key);
    if (hit && hit.expires > Date.now()) return hit.pending;
    if (entries.size >= maxEntries) entries.delete(entries.keys().next().value!);
    const entry = {expires:Infinity,pending:Promise.resolve().then(loader)};
    entries.set(key,entry);
    entry.pending = entry.pending.then(value => {entry.expires = Date.now()+ttlMs;return value;},error => {if(entries.get(key)===entry)entries.delete(key);throw error;});
    return entry.pending;
  };
}
