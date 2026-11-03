(() => {
  "use strict";
  const { api, now, mmss, esc, $, store, toast, confetti, padlock } = window.ER;
  const C = window.COMIC, M = window.MECH;
  const AUTH_KEY = "er-auth";
  const POLL_MS = 3000;

  const S = {
    auth: store.get(AUTH_KEY),
    state: null,
    view: store.get(AUTH_KEY) ? "map" : "cover",
    lockId: null,
    scene: {},                              // escena actual por candado: "intro" | índice | "fin"
    defs: {},                               // definición pública de cada candado
    drafts: store.get("er-drafts") || {},   // valores escritos (persisten en el dispositivo)
    accepted: store.get("er-accepted") || {}, // respuestas aceptadas por el servidor
    feedback: {},
    wrong: {},
    renderedKey: "",
    autoEntered: store.get("er-auto") || "",
    juntaSeen: !!store.get("er-junta"),
    busy: false
  };
  const stage = $("#stage");
  const lockInfo = id => S.state.session.locks.find(l => l.id === id);
  const teamLock = id => S.state.team.locks[id];

  // ---------------- Utilidades de vista ----------------
  function paint(html, ep, anim = true) {
    stage.innerHTML = html;
    if (anim) { stage.classList.remove("enter"); void stage.offsetWidth; stage.classList.add("enter"); window.scrollTo(0, 0); }
    hud(ep);
  }
  function hud(ep) {
    const h = $("#hud");
    if (ep) h.dataset.ep = ep;
    const st = S.state;
    const active = st && st.session.locks.find(l => l.estado === "activa");
    h.innerHTML = `
      <div class="hud-row">
        <div class="hud-brand">SOLUTIONS<b>TECH</b></div>
        ${st ? `<div class="hud-team" title="${esc(st.team.name)}">${esc(st.team.name)}</div>` : ""}
        ${active ? `<div class="hud-timer" data-ends="${active.endsAt}" style="--c:${active.color}">${mmss(active.endsAt - now())}</div>` : ""}
        ${st ? `<div class="hud-score">${st.team.total}<small>pts</small></div>` : ""}
      </div>
      ${C.episodes(+h.dataset.ep || 1)}`;
  }
  function pop(text, color = "verde") {
    const el = document.createElement("div");
    el.className = "pop-layer";
    el.innerHTML = C.boom(text, color, "big");
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }
  const vibrate = p => { try { if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(p); } catch (e) { /* sin vibración */ } };
  const saveDrafts = () => store.set("er-drafts", S.drafts);

  // ---------------- EPISODIO 1 · LA CRISIS ----------------
  function renderCover() {
    S.view = "cover";
    paint(`<section class="page cover">
      <header class="cover-title">
        <div class="kicker">Una novela gráfica interactiva de Programación Entera</div>
        <h1>MISIÓN:<br><span>SALVAR SOLUTIONS TECH</span></h1>
        <div class="ep-tag">${C.epTitle(1)}</div>
      </header>
      <div class="comic-grid cover-grid">
        <div class="panel p-down halftone">${C.sceneDown()}${C.boom("¡CRASH!", "naranja", "tl")}${C.caption("La plataforma de transacciones deja de responder.")}</div>
        <div class="panel p-clients">${C.sceneClients()}${C.caption("Los clientes reclaman y empiezan a irse.")}</div>
        <div class="panel p-tech halftone">${C.sceneTech()}${C.boom("¡URGENTE!", "rojo", "tr")}${C.caption("El equipo técnico atiende incidentes sin parar.")}</div>
        <div class="panel p-dash">${C.sceneDash()}${C.boom("¡ALERTA!", "naranja", "tr")}${C.caption("Los indicadores se desploman.")}</div>
        <div class="panel p-ceo">${C.speaker("ceo", "urgente", "¡Estamos perdiendo clientes cada hora! Tenemos <b>48 horas</b> para tomar decisiones. Necesitamos que nos ayudes a salvar la empresa.", { tipo: "grito" })}</div>
      </div>
      <div class="cta-row"><button class="btn-mission" id="startMission">INICIAR MISIÓN</button></div>
      <p class="principle">NO ESTÁS RESPONDIENDO UN CUESTIONARIO.<br>ESTÁS TOMANDO LAS DECISIONES QUE PUEDEN SALVAR A SOLUTIONS TECH.</p>
    </section>`, 1);
    $("#startMission").addEventListener("click", renderJoin);
  }

  function renderJoin(err = "") {
    S.view = "join";
    const sala = new URLSearchParams(location.search).get("sala") || "";
    paint(`<section class="page join">
      <div class="ep-tag">${C.epTitle(1)}</div>
      <div class="comic-grid join-grid">
        <div class="panel contract">
          <div class="contract-head">CONTRATO DE CONSULTORÍA</div>
          ${C.speaker("consultor", "serio", "Acepto la misión. Necesito el código de la sala de crisis y el nombre de mi equipo.", { nombre: "Tú, el consultor" })}
          <form id="joinForm" autocomplete="off">
            <label class="field">Código de la sala<input class="code-input" name="code" maxlength="5" required placeholder="ABCDE" value="${esc(sala.toUpperCase())}"></label>
            <label class="field">Nombre del equipo consultor<input name="name" maxlength="24" required placeholder="Ej. Los Simplex"></label>
            <button class="btn-mission small" type="submit">FIRMAR CONTRATO</button>
            <div class="error" id="joinError">${esc(err)}</div>
          </form>
        </div>
      </div>
      <button class="link-btn" id="backCover">← Volver a la portada</button>
    </section>`, 1);
    $("#backCover").addEventListener("click", renderCover);
    $("#joinForm").addEventListener("submit", async e => {
      e.preventDefault();
      const f = e.target;
      $("#joinError").textContent = "";
      try {
        const r = await api("join", { code: f.code.value, name: f.name.value });
        S.auth = { code: r.code, teamId: r.teamId, token: r.token };
        store.set(AUTH_KEY, S.auth);
        history.replaceState(null, "", "/");
        S.view = "junta";
        await poll(true);
      } catch (err) { $("#joinError").textContent = err.message; }
    });
  }

  // ---------------- EPISODIO 2 · LA JUNTA ----------------
  function renderJunta() {
    S.view = "junta";
    const name = S.state.team.name;
    paint(`<section class="page junta">
      <div class="ep-tag">${C.epTitle(2)}</div>
      <h2 class="page-title">Sala de juntas</h2>
      <div class="comic-grid junta-grid">
        <div class="panel">${C.speaker("ceo", "serio", "Las fallas en la plataforma de transacciones y las interrupciones del servicio nos están costando clientes. La junta autorizó un presupuesto extraordinario de recuperación.")}</div>
        <div class="panel halftone">${C.speaker("cto", "preocupado", "La plataforma falla y los servicios se interrumpen. Ingeniería de Sistemas identificó proyectos tecnológicos que pueden reducir las pérdidas.", { lado: "der" })}</div>
        <div class="panel">${C.speaker("cfo", "serio", "Las reglas son estrictas: <b>$85.000.000 COP</b> y máximo <b>44 horas</b> de trabajo técnico en las próximas <b>48 horas</b>. Cada proyecto se ejecuta completo o se descarta.")}</div>
        <div class="panel p-me">${C.speaker("consultor", "feliz", `Somos <b>${esc(name)}</b>. Analizaremos los datos y elegiremos la combinación que maximice el beneficio de los próximos 30 días.`, { lado: "der", nombre: name })}</div>
      </div>
      <div class="panel resources-panel">
        <div class="res-title">RECURSOS AUTORIZADOS</div>
        <div class="big-stats">
          ${C.stat("Presupuesto", "$85 <small>millones</small>", "$85.000.000 COP", "cian")}
          ${C.stat("Tiempo técnico", "44 <small>horas</small>", "máximo del equipo", "naranja")}
          ${C.stat("Plazo", "48 <small>horas</small>", "para decidir", "rojo")}
        </div>
      </div>
      ${C.caption("La misión tiene <b>tres casos de 20 minutos</b>. Cada caso lo dirige un grupo de la clase y se abre resolviendo 5 desafíos.", "wide")}
      <div class="cta-row"><button class="btn-mission" id="toMap">VER LOS CASOS →</button></div>
    </section>`, 2);
    $("#toMap").addEventListener("click", () => { S.juntaSeen = true; store.set("er-junta", 1); renderMap(true); });
  }

  // ---------------- Mapa de casos ----------------
  function renderMap(anim = false) {
    S.view = "map";
    const st = S.state;
    const html = `<section class="page map">
      <div class="ep-tag">${C.epTitle(2)} · SALA DE CRISIS</div>
      <h2 class="page-title">Casos de la misión</h2>
      <div class="cases">${st.session.locks.map((l, i) => {
        const t = teamLock(l.id);
        const stamp = t.opened ? `<i class="case-stamp ok">RESUELTO</i>` : l.estado === "cerrada" ? `<i class="case-stamp ko">CERRADO</i>` : l.estado === "pendiente" ? `<i class="case-stamp lock">BLOQUEADO</i>` : "";
        return `<button class="case ${l.estado} ${t.opened ? "solved" : ""}" data-id="${l.id}" style="--c:${l.color}">
          <span class="case-tab">CASO ${i + 1} · ${esc(l.grupo.toUpperCase())}</span>
          <span class="case-icon">${padlock(t.opened, 44)}</span>
          <span class="case-body"><b>${esc(l.titulo)}</b><small>${esc(l.subtitulo)}</small>
            <span class="case-bars">${Array.from({ length: l.subs }, (_, k) => `<i class="${k < t.solved ? "on" : ""}"></i>`).join("")}</span></span>
          <span class="case-state">${l.estado === "activa" && !t.opened ? `<em>EN CURSO</em><span class="t" data-ends="${l.endsAt}">${mmss(l.endsAt - now())}</span>` : `<span class="t">${t.score} pts</span>`}</span>
          ${stamp}</button>`;
      }).join("")}</div>
      ${st.session.locks.some(l => l.estado === "activa") ? "" : `<div class="panel wait">${C.speaker("cto", "serio", `Esperando instrucciones del profesor<span class="dots"><span>.</span><span>.</span><span>.</span></span> Cuando active un caso, se abrirá aquí.`)}</div>`}
      <div class="panel rank">
        <div class="res-title">RANKING DE CONSULTORES</div>
        <p>Van en el puesto <b>${st.position}</b> de ${st.teams}.</p>
        <ol>${st.top.map(r => `<li class="${r.name === st.team.name ? "me" : ""}">${esc(r.name)} <span>${r.total}</span></li>`).join("")}</ol>
      </div>
      <button class="link-btn" id="reJunta">Repasar la reunión de la junta</button>
    </section>`;
    paint(html, 2, anim);
    stage.querySelector(".cases").addEventListener("click", e => {
      const b = e.target.closest(".case");
      if (!b) return;
      const l = lockInfo(b.dataset.id);
      if (l.estado === "pendiente") return toast("Este caso aún está bloqueado.");
      openLock(l.id);
    });
    $("#reJunta").addEventListener("click", renderJunta);
  }

  // ---------------- Casos (episodios 3, 4 y 5) ----------------
  async function openLock(id) {
    S.lockId = id;
    if (!S.juntaSeen) { S.juntaSeen = true; store.set("er-junta", 1); }
    S.renderedKey = "";
    if (!S.defs[id]) {
      try { S.defs[id] = (await api("lock", { ...S.auth, lockId: id })).lock; }
      catch (err) { toast(err.message); return renderMap(); }
    }
    const t = teamLock(id);
    S.scene[id] = t.opened || lockInfo(id).estado === "cerrada" ? "fin" : t.solved === 0 ? "intro" : t.solved;
    S.view = "lock";
    renderLock(true);
  }

  function goScene(sc) { S.scene[S.lockId] = sc; S.renderedKey = ""; renderLock(true); }

  function renderLock(anim = false) {
    S.view = "lock";
    const id = S.lockId, L = S.defs[id], info = lockInfo(id), t = teamLock(id);
    let sc = S.scene[id];
    if (sc === undefined) sc = S.scene[id] = t.solved;
    const key = [id, info.estado, info.startedAt, t.solved, t.hints, t.opened, t.failed, sc].join(":");
    if (key === S.renderedKey && !anim) { hud(); return; }
    S.renderedKey = key;

    const closed = info.estado !== "activa";
    const nav = `<nav class="scene-nav">
      <button class="sn ${sc === "intro" ? "cur" : ""}" data-sc="intro">📁 Expediente</button>
      ${L.subs.map((s, i) => `<button class="sn ${sc === i ? "cur" : ""} ${i < t.solved ? "done" : ""}" data-sc="${i}" ${i > t.solved || (i === t.solved && t.opened) ? "disabled" : ""}>${i < t.solved ? "✓" : i > t.solved ? "🔒" : ""} ${s.id}</button>`).join("")}
      ${t.opened || closed ? `<button class="sn ${sc === "fin" ? "cur" : ""}" data-sc="fin">🏁</button>` : ""}
    </nav>`;
    const head = `<div class="case-head" style="--c:${L.color}">
      <button class="link-btn" id="toMapBtn">← Casos</button>
      <div><small>${esc(L.grupo)} · ${esc(L.subtitulo)}</small><b>${esc(L.titulo)}</b></div>
    </div>`;

    let body, ep;
    if (sc === "intro") { body = introScene(L, t, closed); ep = 3; }
    else if (sc === "fin") { body = finScene(L, t, info); ep = 5; }
    else { body = subScene(L, L.subs[sc], sc, t, closed); ep = 4; }

    paint(`<section class="page lockpage" style="--c:${L.color}">${head}${nav}${body}</section>`, ep, anim);
    bindLock(L, sc, t, closed);
  }

  // EPISODIO 3 · ANÁLISIS DE LOS PROYECTOS
  function introScene(L, t, closed) {
    const groups = Object.entries(L.proyectos);
    return `<div class="ep-tag">${C.epTitle(3)}</div>
      <div class="comic-grid intro-grid">
        <div class="panel halftone">${C.speaker(L.quien, "preocupado", L.historia)}</div>
        <div class="panel brief">${C.caption("INFORME DEL CASO", "label")}${L.enunciado}</div>
      </div>
      ${groups.map(([g, ps], gi) => `<h3 class="sec-title">${esc(L.tablas[gi] ? L.tablas[gi].titulo : "Proyectos")}</h3>
        <div class="dossiers">${ps.map(p => C.dossier(p, { unidad: p.max && g !== "p" ? "/u" : "" })).join("")}</div>`).join("")}
      <div class="cta-row">${t.opened ? `<button class="btn-mission small" data-go="fin">VER CONSECUENCIAS →</button>`
        : closed ? `<button class="btn-mission small" data-go="fin">VER RESULTADO →</button>`
        : `<button class="btn-mission small" data-go="${t.solved}">${t.solved ? "CONTINUAR EL DESAFÍO →" : "ACEPTAR EL DESAFÍO →"}</button>`}</div>`;
  }

  // EPISODIO 4 · EL DESAFÍO
  function subScene(L, s, i, t, closed) {
    const done = i < t.solved;
    const ui = s.ui || {};
    const ctx = {
      L, wrong: done ? [] : S.wrong[L.id + ":" + s.id] || [],
      disabled: done || closed,
      val: fid => (done && S.accepted[L.id + ":" + s.id] ? S.accepted[L.id + ":" + s.id][fid] : S.drafts[L.id + ":" + s.id + ":" + fid])
    };
    const fb = !done && S.feedback[L.id] && S.feedback[L.id].sub === s.id ? S.feedback[L.id] : null;
    const used = S.state.hints[L.id] || [];
    const next = L.pistas[used.length];
    return `<div class="ep-tag">${C.epTitle(4)} · DESAFÍO ${esc(s.id)} DE ${L.subs.length}</div>
      <div class="panel story">${C.speaker(ui.quien || "ceo", ui.animo || "serio", esc(ui.dice || s.descripcion), { tipo: ui.animo === "urgente" ? "grito" : "habla" })}</div>
      <div class="panel challenge ${done ? "solved" : ""}" data-sub="${s.id}">
        ${C.caption(`<b>${esc(s.titulo)}</b> — ${esc(s.descripcion)}`, "label")}
        ${M.render(s, ctx)}
        ${done ? `<i class="solved-stamp">RESUELTO</i>` : ""}
      </div>
      ${fb ? `<div class="feedback ${fb.ok ? "ok" : "bad"}">${C.boom(fb.ok ? "¡CORRECTO!" : "¡ERROR!", fb.ok ? "verde" : "rojo")}${C.bubble(esc(fb.msg), { tipo: fb.ok ? "habla" : "grito" })}</div>` : ""}
      ${done ? `<div class="cta-row"><button class="btn-mission small" data-go="${t.opened ? "fin" : t.solved}">${t.opened ? "VER CONSECUENCIAS →" : "IR AL DESAFÍO ACTUAL →"}</button></div>`
        : closed ? `<div class="panel closed-msg">${C.boom("¡TIEMPO!", "rojo")}<p>El caso se cerró. Obtuvieron <b>${t.score} pts</b>.</p></div>`
        : `<div class="action-bar">
            <button class="btn-mission" id="tryBtn">🔓 PROBAR</button>
            <button class="btn-ghost" id="dataBtn">📁 Datos</button>
            ${next ? `<button class="btn-ghost warn" id="hintBtn">💡 Pista (−${next.costo})</button>` : ""}
            <span class="attempts">${t.failed} fallo(s) · −5 c/u</span>
          </div>`}
      ${used.length ? `<div class="hints">${used.map((h, k) => `<div class="hint">${C.char("consultor", "serio", 54)}${C.bubble(`<b>Nota ${k + 1}:</b> ${esc(h)}`, { tipo: "pensamiento" })}</div>`).join("")}</div>` : ""}`;
  }

  // EPISODIO 5 · CONSECUENCIAS
  function finScene(L, t, info) {
    if (!t.opened) {
      return `<div class="ep-tag">${C.epTitle(5)}</div>
        <div class="comic-grid fin-grid">
          <div class="panel">${C.boom("¡TIEMPO AGOTADO!", "rojo", "tl")}${C.trend(false)}${C.caption("La crisis continúa en este frente.")}</div>
          <div class="panel">${C.speaker("ceo", "preocupado", `No alcanzamos a abrir el ${esc(L.titulo.toLowerCase())}. Resolvieron ${t.solved} de ${L.subs.length} desafíos y suman <b>${t.score} pts</b> en este caso.`)}</div>
        </div>
        <div class="cta-row"><button class="btn-mission small" id="toMap2">VOLVER A LOS CASOS</button></div>`;
    }
    const cq = L.consecuencias, vals = cq && S.accepted[L.id + ":" + cq.sub];
    const ps = cq ? L.proyectos[cq.grupo] || [] : [];
    let tiles = "";
    if (vals) {
      const x = cq.vars.map(v => toNum(vals[v]));
      const cost = ps.reduce((a, p, i) => a + p.costo * x[i], 0), hours = ps.reduce((a, p, i) => a + p.horas * x[i], 0);
      const ben = ps.reduce((a, p, i) => a + p.beneficio * x[i], 0);
      const lim = L.limites;
      tiles = `<div class="comic-grid cons-grid">
        <div class="panel cons"><div class="cons-h">🛠 Recuperación de servicios</div>
          <ul>${ps.map((p, i) => `<li class="${x[i] > 0 ? "on" : "off"}">${x[i] > 0 ? "✔" : "✖"} ${esc(p.cod)} · ${esc(p.nombre)}${x[i] > 0 && !(x[i] === 1 && cq.unidad === "proyecto") ? ` <b>× ${fmtN(x[i])}</b>` : ""}</li>`).join("")}</ul></div>
        <div class="panel cons"><div class="cons-h">📉 Reducción de pérdidas</div><b class="cons-big">$${fmtN(ben)} M</b><small>beneficio protegido o recuperado en los próximos 30 días</small></div>
        <div class="panel cons"><div class="cons-h">🤝 Protección de clientes</div>${C.trend(true)}<small>La operación se estabiliza con los proyectos en marcha.</small></div>
        <div class="panel cons"><div class="cons-h">💰 Uso de recursos</div>
          ${C.gauge("Presupuesto", +cost.toFixed(2), lim.presupuesto, "M", { fmt: v => "$" + fmtN(v) })}
          ${C.gauge("Horas", +hours.toFixed(2), lim.horas, "h", { color: "naranja", fmt: fmtN })}
          <small>${cost <= lim.presupuesto + 1e-9 && hours <= lim.horas + 1e-9 ? "✔ Restricciones cumplidas" : ""} · ✔ Coincide con la mejor solución</small></div>
      </div>`;
    }
    return `<div class="ep-tag">${C.epTitle(5)}</div>
      <div class="panel newspaper halftone">
        <div class="np-name">EL DIARIO TECH</div>
        <h2>¡${esc(L.titulo.toUpperCase())} ABIERTO!</h2>
        <p>Las decisiones del equipo <b>${esc(S.state.team.name)}</b> empiezan a sacar a Solutions TECH de la crisis.</p>
        ${C.boom(`+${t.score} PTS`, "verde", "tr")}
      </div>
      ${tiles}
      <div class="panel">${C.speaker("ceo", "feliz", `¡Excelente trabajo! Abrieron el caso en ${t.openedIn != null ? mmss(t.openedIn) : "—"} con ${t.failed} fallo(s) y ${t.hints} pista(s).${t.openedIn != null && t.openedIn <= L.bonusMin * 60000 ? ` Incluye +20 por terminar antes de ${L.bonusMin} minutos.` : ""}`)}</div>
      <div class="cta-row"><button class="btn-mission small" id="toMap2">VOLVER A LOS CASOS</button></div>`;
  }
  const fmtN = v => (Math.round(v * 100) / 100).toLocaleString("es-CO");
  // solo para mostrar consecuencias (la validación real está en el servidor)
  const toNum = v => {
    const s = String(v == null ? "" : v).trim().replace(",", ".");
    const [a, b] = s.split("/");
    const n = b !== undefined ? +a / +b : +s;
    return Number.isFinite(n) ? n : 0;
  };

  function bindLock(L, sc, t, closed) {
    $("#toMapBtn").addEventListener("click", () => { S.lockId = null; renderMap(true); });
    stage.querySelector(".scene-nav").addEventListener("click", e => {
      const b = e.target.closest(".sn");
      if (!b || b.disabled) return;
      goScene(b.dataset.sc === "intro" || b.dataset.sc === "fin" ? b.dataset.sc : +b.dataset.sc);
    });
    stage.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => goScene(b.dataset.go === "fin" ? "fin" : +b.dataset.go)));
    const m2 = $("#toMap2"); if (m2) m2.addEventListener("click", () => { S.lockId = null; renderMap(true); });
    if (typeof sc !== "number") return;
    const s = L.subs[sc];
    const box = stage.querySelector(".challenge");
    if (sc < t.solved || closed) return;
    const dk = f => L.id + ":" + s.id + ":" + f;
    const ctx = { L, val: f => S.drafts[dk(f)] };
    M.bind(box, s, ctx, (f, v) => { S.drafts[dk(f)] = v; saveDrafts(); });
    box.addEventListener("input", e => {
      const el = e.target;
      if (el.dataset.f) S.drafts[dk(el.dataset.f)] = el.value;
      const m = el.closest("[data-multi]");
      if (m) {
        S.drafts[dk(m.dataset.multi)] = [...m.querySelectorAll("input:checked")].map(i => i.value);
        const card = el.closest(".stamp-card"); if (card && el.checked) { card.classList.remove("thud"); void card.offsetWidth; card.classList.add("thud"); }
      }
      el.classList.remove("wrong");
      saveDrafts();
    });
    box.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.tagName === "INPUT") { e.preventDefault(); submit(s.id); } });
    $("#tryBtn").addEventListener("click", () => submit(s.id));
    $("#dataBtn").addEventListener("click", () => openData(L));
    const h = $("#hintBtn"); if (h) h.addEventListener("click", askHint);
  }

  function openData(L) {
    const d = $("#dataDlg");
    $("#dataBody").innerHTML = `${L.enunciado}${L.tablas.map(tb => `<div class="tbl"><table><caption>${esc(tb.titulo)}</caption>
      <thead><tr>${tb.cols.map(c => `<th>${esc(c)}</th>`).join("")}</tr></thead>
      <tbody>${tb.rows.map(r => `<tr>${r.map(v => `<td class="${typeof v === "number" ? "n" : ""}">${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`).join("")}`;
    d.showModal();
  }
  $("#dataClose").addEventListener("click", () => $("#dataDlg").close());

  function collect() {
    const box = stage.querySelector(".challenge");
    const vals = {};
    box.querySelectorAll("[data-f]").forEach(el => (vals[el.dataset.f] = el.value));
    box.querySelectorAll("[data-multi]").forEach(m => (vals[m.dataset.multi] = [...m.querySelectorAll("input:checked")].map(i => i.value)));
    return vals;
  }

  async function submit(sid) {
    if (S.busy) return;
    const vals = collect();
    if (Object.values(vals).some(v => !Array.isArray(v) && String(v).trim() === "")) {
      return toast("Completa todas las decisiones antes de probar.");
    }
    S.busy = true;
    $("#tryBtn").disabled = true;
    try {
      const r = await api("answer", { ...S.auth, lockId: S.lockId, subId: sid, values: vals });
      S.wrong[S.lockId + ":" + sid] = r.wrong;
      if (r.ok) {
        S.accepted[S.lockId + ":" + sid] = vals;
        store.set("er-accepted", S.accepted);
        S.feedback[S.lockId] = null;
        pop(r.opened ? "¡CANDADO ABIERTO!" : "¡BUENA DECISIÓN! +20", "verde");
        vibrate(60);
        if (r.opened) confetti(["#39f29a", "#21e3ff", "#ff8a1f", "#ffffff"]);
        const t = r.summary;
        S.scene[S.lockId] = r.opened ? "fin" : t.solved;
      } else {
        S.feedback[S.lockId] = { ok: false, sub: sid, msg: (r.msg || "Combinación incorrecta.") + " (−5 pts)" };
        vibrate([80, 60, 80]);
      }
      await poll(false, true);
    } catch (err) { toast(err.message); await poll(); }
    finally { S.busy = false; const b = $("#tryBtn"); if (b) b.disabled = false; }
  }

  async function askHint() {
    const L = S.defs[S.lockId], used = (S.state.hints[S.lockId] || []).length;
    if (!confirm(`¿Usar la pista ${used + 1}? Cuesta ${L.pistas[used].costo} puntos.`)) return;
    try { await api("hint", { ...S.auth, lockId: S.lockId }); await poll(false, true); }
    catch (err) { toast(err.message); }
  }

  // ---------------- EPISODIO 6 · INFORME FINAL ----------------
  function renderFinal() {
    if (S.view === "final") { hud(6); return; }
    S.view = "final";
    const st = S.state;
    const inf = st.informe || [];
    const rows = st.session.locks.map(l => {
      const t = st.team.locks[l.id];
      const r = inf.find(x => x.id === l.id);
      return `<tr><td><b style="color:${l.color}">${esc(l.titulo)}</b><small>${esc(l.grupo)}</small></td>
        <td>${t.opened ? `<span class="ok">✔ Abierto</span>` : `<span class="ko">✖ Cerrado</span>`}</td>
        <td class="n">${t.solved}/${l.subs}</td><td class="n">${t.failed}</td><td class="n">${t.hints}</td><td class="n"><b>${t.score}</b></td></tr>
        <tr class="best"><td colspan="6">${t.opened ? "✔ Su decisión coincide con la mejor solución. " : ""}<b>Mejor solución:</b> ${esc(r ? r.resumen : "—")}</td></tr>`;
    }).join("");
    paint(`<section class="page final">
      <div class="ep-tag">${C.epTitle(6)}</div>
      <div class="panel report">
        <i class="report-stamp">CONFIDENCIAL</i>
        <div class="report-head"><small>SOLUTIONS TECH · JUNTA DIRECTIVA</small><h2>Informe ejecutivo de la consultoría</h2>
          <p>Equipo consultor: <b>${esc(st.team.name)}</b> · Sala ${esc(st.session.code)}</p></div>
        <div class="big-stats">
          ${C.stat("Puesto", "#" + st.position, `de ${st.teams} equipos`, "naranja")}
          ${C.stat("Puntaje total", st.team.total, "puntos", "verde")}
          ${C.stat("Casos abiertos", st.session.locks.filter(l => st.team.locks[l.id].opened).length + "/3", "candados", "cian")}
        </div>
        <div class="tbl"><table><thead><tr><th>Caso</th><th>Estado</th><th class="n">Desafíos</th><th class="n">Fallos</th><th class="n">Pistas</th><th class="n">Puntos</th></tr></thead><tbody>${rows}</tbody></table></div>
        <div class="report-rank"><div class="res-title">RANKING FINAL</div><ol>${st.top.map(r => `<li class="${r.name === st.team.name ? "me" : ""}">${esc(r.name)} <span>${r.total}</span></li>`).join("")}</ol></div>
      </div>
      <div class="panel">${C.speaker("ceo", st.team.total > 0 ? "feliz" : "preocupado", st.team.total > 0 ? "Gracias, consultores. Con estas decisiones Solutions TECH sigue en pie." : "La empresa sigue en riesgo, pero aprendimos mucho de este análisis.")}</div>
      <div class="cta-row"><button class="link-btn" id="leaveBtn">Salir de la sala</button></div>
    </section>`, 6);
    confetti(["#39f29a", "#21e3ff", "#ff8a1f", "#ffffff"]);
    $("#leaveBtn").addEventListener("click", () => {
      for (const k of [AUTH_KEY, "er-drafts", "er-auto", "er-accepted", "er-junta"]) store.del(k);
      location.href = "/";
    });
  }

  // ---------------- Sondeo y enrutamiento ----------------
  async function poll(fromJoin = false, force = false) {
    if (!S.auth) { if (S.view !== "join") renderCover(); return; }
    try {
      S.state = await api("state", S.auth);
      route(fromJoin, force);
    } catch (err) {
      if (err.status === 403 || err.status === 404) {
        store.del(AUTH_KEY); S.auth = null; S.state = null;
        renderJoin(err.message);
      }
    }
  }

  function route(fromJoin, force) {
    const st = S.state;
    if (st.session.status === "finalizada") return renderFinal();
    if (S.view === "final") S.view = "map";
    const active = st.session.locks.find(l => l.estado === "activa");
    const key = active ? active.id + ":" + active.startedAt : "";
    const firstLoad = !S.loaded;
    S.loaded = true;
    if (fromJoin || (!S.juntaSeen && firstLoad && !active)) return renderJunta();
    // al activarse un caso (o al recargar durante uno) se entra automáticamente
    if (active && (S.autoEntered !== key || (firstLoad && !teamLock(active.id).opened))) {
      S.autoEntered = key; store.set("er-auto", key);
      return openLock(active.id);
    }
    if (S.view === "lock" && S.lockId) return renderLock(force);
    if (S.view === "junta") return hud();
    renderMap(firstLoad);
  }

  // ---------------- Relojes ----------------
  function tick() {
    document.querySelectorAll("[data-ends]").forEach(el => {
      const ms = +el.dataset.ends - now();
      el.textContent = mmss(ms);
      el.classList.toggle("low", ms < 120000 && ms > 0);
    });
    if (S.state && S.view === "lock" && S.lockId) {
      const l = lockInfo(S.lockId);
      if (l.estado === "activa" && l.endsAt - now() <= 0) poll();
    }
  }
  setInterval(tick, 1000);
  setInterval(() => { if (!document.hidden && S.auth && !S.busy) poll(); }, POLL_MS);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && S.auth) poll(); });

  hud(1);
  if (S.auth) poll(); else renderCover();
})();
