// Almacenamiento: Upstash Redis (REST) en Vercel; memoria del proceso en local.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const TTL = 60 * 60 * 12; // las salas viven 12 horas

function redis() {
  const call = async (path, body) => {
    const r = await fetch(URL_ + path, {
      method: "POST",
      headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    return j;
  };
  const cmd = async (...args) => (await call("", args)).result;
  const pipe = async cmds => (await call("/pipeline", cmds)).map(x => {
    if (x.error) throw new Error(x.error);
    return x.result;
  });
  return {
    kind: "redis",
    async get(k) { const v = await cmd("GET", k); return v ? JSON.parse(v) : null; },
    async set(k, v) { await cmd("SET", k, JSON.stringify(v), "EX", TTL); },
    async hget(k, f) { const v = await cmd("HGET", k, f); return v ? JSON.parse(v) : null; },
    async hset(k, f, v) { await pipe([["HSET", k, f, JSON.stringify(v)], ["EXPIRE", k, TTL]]); },
    async hgetall(k) {
      const flat = (await cmd("HGETALL", k)) || [];
      const out = [];
      for (let i = 1; i < flat.length; i += 2) out.push(JSON.parse(flat[i]));
      return out;
    }
  };
}

function memory() {
  const g = globalThis.__escapeStore || (globalThis.__escapeStore = { kv: new Map(), h: new Map() });
  const copy = v => (v == null ? null : JSON.parse(JSON.stringify(v)));
  return {
    kind: "memoria",
    async get(k) { return copy(g.kv.get(k)); },
    async set(k, v) { g.kv.set(k, copy(v)); },
    async hget(k, f) { return copy(g.h.get(k)?.get(f)); },
    async hset(k, f, v) { if (!g.h.has(k)) g.h.set(k, new Map()); g.h.get(k).set(f, copy(v)); },
    async hgetall(k) { return [...(g.h.get(k)?.values() || [])].map(copy); }
  };
}

module.exports = URL_ && TOKEN ? redis() : memory();
