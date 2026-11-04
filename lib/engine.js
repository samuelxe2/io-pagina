// Lógica del juego: salas, equipos, respuestas, pistas y puntaje.
const crypto = require("crypto");
const store = require("./store");
const { LOCKS, ORDER, publicLock } = require("./locks");

const DEFAULT_MIN = 80;
const sKey = code => "s:" + code;
const tKey = code => "t:" + code;
const rid = n => crypto.randomBytes(n).toString("hex");
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const roomCode = () => Array.from(crypto.randomBytes(5), b => ALPHA[b % ALPHA.length]).join("");

class GameError extends Error { constructor(msg, status = 400) { super(msg); this.status = status; } }
const fail = (msg, status) => { throw new GameError(msg, status); };

// ---------------- Estado de los candados ----------------
function lockState(sess, id, now) {
  const l = sess.locks[id];
  if (!l) return "pendiente";
  if (l.closedAt || now >= l.endsAt) return "cerrada";
  return "activa";
}

function publicSession(sess, now) {
  return {
    code: sess.code, status: sess.status, now,
    locks: ORDER.map(id => {
      const L = LOCKS[id], l = sess.locks[id] || {};
      return {
        id, grupo: L.grupo, titulo: L.titulo, subtitulo: L.subtitulo, color: L.color, subs: L.subs.length,
        estado: lockState(sess, id, now), startedAt: l.startedAt || null,
        endsAt: l.closedAt ? Math.min(l.closedAt, l.endsAt) : l.endsAt || null, minutos: l.minutos || DEFAULT_MIN
      };
    })
  };
}

// ---------------- Puntaje ----------------
// 20 por sub-candado, −5 por intento fallido (máx. −50 por candado), pistas restan,
// +20 si abre antes de bonusMin minutos, mínimo 20 si lo abre.
function lockScore(team, sess, id) {
  const st = team.locks[id];
  if (!st) return 0;
  const L = LOCKS[id];
  const pen = Math.min(50, 5 * st.failed);
  const hp = L.pistas.slice(0, st.hints).reduce((s, p) => s + p.costo, 0);
  if (st.openedAt) {
    const l = sess.locks[id];
    const bonus = l && st.openedAt - l.startedAt <= L.bonusMin * 60000 ? 20 : 0;
    return Math.max(20, 20 * L.subs.length - pen - hp + bonus);
  }
  return Math.max(0, 20 * st.solved.length - pen - hp);
}

function teamSummary(team, sess) {
  const locks = {};
  let total = 0, time = 0;
  for (const id of ORDER) {
    const st = team.locks[id];
    const score = lockScore(team, sess, id);
    total += score;
    if (st && st.openedAt && sess.locks[id]) time += st.openedAt - sess.locks[id].startedAt;
    locks[id] = st
      ? { solved: st.solved.length, failed: st.failed, hints: st.hints, opened: !!st.openedAt,
          openedIn: st.openedAt && sess.locks[id] ? st.openedAt - sess.locks[id].startedAt : null, score }
      : { solved: 0, failed: 0, hints: 0, opened: false, openedIn: null, score: 0 };
  }
  return { id: team.id, name: team.name, locks, total, time };
}

function ranking(teams, sess) {
  return teams.map(t => teamSummary(t, sess))
    .sort((a, b) => b.total - a.total || a.time - b.time || a.name.localeCompare(b.name));
}

// ---------------- Carga y autenticación ----------------
async function loadSession(code) {
  code = String(code || "").trim().toUpperCase();
  const sess = code && await store.get(sKey(code));
  if (!sess) fail("La sala no existe o ya expiró.", 404);
  return sess;
}
async function asHost(d) {
  const sess = await loadSession(d.code);
  if (!d.hostKey || d.hostKey !== sess.hostKey) fail("Clave de profesor inválida.", 403);
  return sess;
}
async function asTeam(d) {
  const sess = await loadSession(d.code);
  const team = await store.hget(tKey(sess.code), String(d.teamId || ""));
  if (!team || team.token !== d.token) fail("Tu equipo no está registrado en esta sala.", 403);
  return { sess, team };
}
function lockOf(id) {
  if (!LOCKS[id]) fail("Candado desconocido.");
  return LOCKS[id];
}
function lockStateFor(team, id) {
  return team.locks[id] || (team.locks[id] = { solved: [], failed: 0, attempts: {}, hints: 0, openedAt: null });
}

// ---------------- Acciones ----------------
const actions = {
  // ----- Profesor -----
  async "host.create"() {
    let code;
    for (let i = 0; i < 5; i++) { code = roomCode(); if (!(await store.get(sKey(code)))) break; }
    const sess = { code, hostKey: rid(16), createdAt: Date.now(), status: "abierta", locks: {} };
    await store.set(sKey(code), sess);
    return { code, hostKey: sess.hostKey };
  },

  async "host.state"(d) {
    const sess = await asHost(d), now = Date.now();
    const teams = await store.hgetall(tKey(sess.code));
    return { session: publicSession(sess, now), board: ranking(teams, sess), storage: store.kind };
  },

  async "host.start"(d) {
    const sess = await asHost(d), now = Date.now();
    lockOf(d.lockId);
    const minutos = Math.min(120, Math.max(1, +d.minutos || DEFAULT_MIN));
    for (const id of ORDER) if (lockState(sess, id, now) === "activa") sess.locks[id].closedAt = now;
    sess.locks[d.lockId] = { startedAt: now, endsAt: now + minutos * 60000, minutos, closedAt: null };
    sess.status = "abierta";
    await store.set(sKey(sess.code), sess);
    return { session: publicSession(sess, now) };
  },

  async "host.extend"(d) {
    const sess = await asHost(d), now = Date.now();
    const l = sess.locks[d.lockId];
    if (!l) fail("Ese candado no se ha iniciado.");
    const m = Math.max(1, +d.minutos || 2);
    l.closedAt = null;
    l.endsAt = Math.max(l.endsAt, now) + m * 60000;
    await store.set(sKey(sess.code), sess);
    return { session: publicSession(sess, now) };
  },

  async "host.close"(d) {
    const sess = await asHost(d), now = Date.now();
    const l = sess.locks[d.lockId];
    if (l && lockState(sess, d.lockId, now) === "activa") l.closedAt = now;
    await store.set(sKey(sess.code), sess);
    return { session: publicSession(sess, now) };
  },

  async "host.finish"(d) {
    const sess = await asHost(d), now = Date.now();
    for (const id of ORDER) if (lockState(sess, id, now) === "activa") sess.locks[id].closedAt = now;
    sess.status = "finalizada";
    await store.set(sKey(sess.code), sess);
    return { session: publicSession(sess, now) };
  },

  async "host.solution"(d) {
    await asHost(d);
    const L = lockOf(d.lockId);
    return { titulo: L.titulo, grupo: L.grupo, html: L.solucion };
  },

  async "host.lock"(d) {
    await asHost(d);
    lockOf(d.lockId);
    return { lock: publicLock(d.lockId) };
  },

  // ----- Equipos -----
  async join(d) {
    const sess = await loadSession(d.code);
    const name = String(d.name || "").replace(/\s+/g, " ").trim().slice(0, 24);
    if (name.length < 2) fail("Escribe un nombre de equipo (mínimo 2 caracteres).");
    const teams = await store.hgetall(tKey(sess.code));
    if (teams.some(t => t.name.toLowerCase() === name.toLowerCase())) fail("Ese nombre ya está en uso en esta sala.");
    const team = { id: rid(6), token: rid(16), name, joinedAt: Date.now(), locks: {} };
    await store.hset(tKey(sess.code), team.id, team);
    return { code: sess.code, teamId: team.id, token: team.token, name };
  },

  async state(d) {
    const { sess, team } = await asTeam(d);
    const now = Date.now();
    const teams = await store.hgetall(tKey(sess.code));
    const rank = ranking(teams, sess);
    const pos = rank.findIndex(r => r.id === team.id);
    const hints = {};
    for (const id of ORDER) hints[id] = LOCKS[id].pistas.slice(0, team.locks[id]?.hints || 0).map(p => p.texto);
    return {
      session: publicSession(sess, now),
      team: rank[pos], position: pos + 1, teams: rank.length,
      top: rank.slice(0, 5).map(r => ({ name: r.name, total: r.total })),
      hints,
      // la mejor solución de cada candado solo se revela al finalizar el juego
      informe: sess.status === "finalizada" ? ORDER.map(id => ({ id, titulo: LOCKS[id].titulo, resumen: LOCKS[id].resumen })) : null
    };
  },

  async lock(d) {
    const { sess } = await asTeam(d);
    lockOf(d.lockId);
    if (lockState(sess, d.lockId, Date.now()) === "pendiente") fail("Este candado aún no se ha activado.");
    return { lock: publicLock(d.lockId) };
  },

  async answer(d) {
    const { sess, team } = await asTeam(d);
    const L = lockOf(d.lockId), now = Date.now();
    if (lockState(sess, L.id, now) !== "activa") fail("El candado está cerrado. Espera al profesor.");
    const st = lockStateFor(team, L.id);
    if (st.openedAt) fail("Ya abriste este candado.");
    const sub = L.subs[st.solved.length];
    if (!sub || sub.id !== d.subId) fail("Ese sub-candado no está disponible.");
    const vals = d.values && typeof d.values === "object" ? d.values : {};
    let res;
    try { res = sub.check(vals); } catch (e) { res = { ok: false, msg: "No se pudo validar la respuesta." }; }
    st.attempts[sub.id] = (st.attempts[sub.id] || 0) + 1;
    if (res.ok) {
      st.solved.push(sub.id);
      if (st.solved.length === L.subs.length) st.openedAt = now;
    } else st.failed++;
    await store.hset(tKey(sess.code), team.id, team);
    return {
      ok: !!res.ok, wrong: res.wrong || [], msg: res.msg || null, opened: !!st.openedAt,
      summary: teamSummary(team, sess).locks[L.id]
    };
  },

  async hint(d) {
    const { sess, team } = await asTeam(d);
    const L = lockOf(d.lockId);
    if (lockState(sess, L.id, Date.now()) !== "activa") fail("El candado está cerrado.");
    const st = lockStateFor(team, L.id);
    if (st.openedAt) fail("Ya abriste este candado.");
    if (st.hints >= L.pistas.length) fail("Ya usaste todas las pistas.");
    st.hints++;
    await store.hset(tKey(sess.code), team.id, team);
    return { hints: L.pistas.slice(0, st.hints).map(p => p.texto), summary: teamSummary(team, sess).locks[L.id] };
  }
};

async function handle(action, data) {
  const fn = actions[action];
  if (!fn) throw new GameError("Acción desconocida.");
  return fn(data || {});
}

module.exports = { handle, GameError };
