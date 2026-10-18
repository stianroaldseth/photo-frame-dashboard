// Last-known-good cache per widget. A failed refresh serves the previous data marked stale,
// so the wall never shows an error screen just because one source is down.
export function createWidget({ name, ttlMs, load }) {
  let last = null;      // { data, source, updatedAt }
  let inflight = null;

  async function refresh() {
    const { data, source } = await load();
    last = { data, source, updatedAt: new Date().toISOString() };
    return last;
  }

  return {
    name,
    async get(now = Date.now()) {
      if (last && now - Date.parse(last.updatedAt) < ttlMs) return { ...last, stale: false };
      try {
        inflight = inflight || refresh().finally(() => { inflight = null; });
        return { ...(await inflight), stale: false };
      } catch (err) {
        console.warn(`[${name}] refresh failed: ${err.message}`);
        if (last) return { ...last, stale: true, error: err.message };
        return { data: null, source: null, updatedAt: null, stale: true, error: err.message };
      }
    },
  };
}
