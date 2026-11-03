(() => {
  "use strict";
  const { api, now, mmss, esc, $, store, toast, confetti, padlock } = window.ER;
  const HOST_KEY = "er-host";
  const POLL_MS = 2500;

  let auth = store.get(HOST_KEY);  // { code, hostKey }
  let data = null;
  let podiumShown = false;

  const show = id => ["hStart", "hBoard", "hPodium"].forEach(v => $("#" + v).classList.toggle("hidden", v !== id));
  $("#startLock").innerHTML = padlock(false, 70);

  // ---------------- Crear / reanudar ----------------
  if (auth) {
    $("#resume").innerHTML = `<button class="btn block ghost" id="resumeBtn" style="margin-top:10px">Reanudar sala ${esc(auth.code)}</button>`;
    $("#resumeBtn").addEventListener("click", () => start());
  }
  $("#createBtn").addEventListener("click", async () => {
    try {
      auth = await api("host.create");
      store.set(HOST_KEY, auth);
      podiumShown = false;
      start();
    } catch (e) { $("#startError").textContent = e.message; }
  });
  $("#newBtn").addEventListener("click", () => {
    if (!confirm("¿Crear una sala nueva? Los estudiantes tendrán que volver a entrar.")) return;
    store.del(HOST_KEY); auth = null; location.reload();
  });

  function start() {
    show("hBoard");
    const url = location.origin + "/?sala=" + auth.code;
    $("#code").textContent = auth.code;
    $("#joinUrl").textContent = location.host;
    $("#qr").innerHTML = "";
    if (window.QRCode) new QRCode($("#qr"), { text: url, width: 116, height: 116, correctLevel: QRCode.CorrectLevel.M });
    else $("#qr").innerHTML = `<div style="color:#000;font:700 12px sans-serif;padding:8px">${esc(url)}</div>`;
    poll();
  }

  // ---------------- Sondeo ----------------
  async function poll() {
    if (!auth) return;
    try {
      data = await api("host.state", auth);
      render();
    } catch (e) {
      if (e.status === 403 || e.status === 404) {
        store.del(HOST_KEY); auth = null; show("hStart");
        $("#startError").textContent = e.message;
      }
    }
  }

  function render() {
    const { session, board } = data;
    if (session.status === "finalizada" && !podiumShown) { podiumShown = true; return renderPodium(); }
    if (!$("#hPodium").classList.contains("hidden")) return;
    $("#nTeams").textContent = board.length;
    $("#storage").textContent = data.storage === "memoria" ? "⚠ almacenamiento en memoria (solo local)" : "";

    const active = session.locks.find(l => l.estado === "activa");
    $("#clockLabel").textContent = active ? `${active.titulo} · ${active.grupo}` : "Sin candado activo";
    $("#clockLabel").style.color = active ? active.color : "";
    $("#bigTimer").dataset.ends = active ? active.endsAt : "";

    $("#hLocks").innerHTML = session.locks.map(l => {
      const opened = board.filter(t => t.locks[l.id].opened).length;
      const st = l.estado === "activa" ? `<span style="color:${l.color}">● ACTIVO · <span data-ends="${l.endsAt}">${mmss(l.endsAt - now())}</span></span>`
        : l.estado === "cerrada" ? `<span class="muted">CERRADO</span>` : `<span class="muted">PENDIENTE</span>`;
      const acts = l.estado === "activa"
        ? `<button class="btn small" data-act="extend" data-id="${l.id}">+2 min</button>
           <button class="btn small danger" data-act="close" data-id="${l.id}">Cerrar</button>`
        : `<div class="mins">Minutos <input type="number" min="1" max="120" value="${l.minutos}" id="min-${l.id}"></div>
           <button class="btn small primary" data-act="start" data-id="${l.id}">${l.estado === "cerrada" ? "Reiniciar" : "▶ Iniciar"}</button>`;
      return `<div class="h-lock ${l.estado}" style="--c:${l.color}">
        <div class="top">${padlock(l.estado === "cerrada", 30)}<div><small>${esc(l.grupo)}</small><h3>${esc(l.titulo)}</h3></div></div>
        <small>${esc(l.subtitulo)}</small>
        <div class="st">${st}</div>
        <div class="opened-count">${opened}/${board.length} equipos lo abrieron</div>
        <div class="acts">${acts}<button class="btn small ghost" data-act="sol" data-id="${l.id}">Ver solución</button></div>
      </div>`;
    }).join("");

    // Progreso del candado activo (o del último iniciado)
    const focus = active || [...session.locks].filter(l => l.startedAt).sort((a, b) => b.startedAt - a.startedAt)[0];
    $("#activeName").textContent = focus ? focus.titulo : "";
    $("#hProgress").innerHTML = !board.length
      ? `<p class="muted">Aún no hay equipos. Muestra el código QR para que entren.</p>`
      : !focus ? `<p class="muted">${board.map(t => esc(t.name)).join(" · ")}</p>`
      : [...board].sort((a, b) => b.locks[focus.id].solved - a.locks[focus.id].solved || b.locks[focus.id].score - a.locks[focus.id].score)
        .map(t => {
          const x = t.locks[focus.id];
          return `<div class="pr ${x.opened ? "open" : ""}"><span class="nm">${x.opened ? "🔓 " : ""}${esc(t.name)}</span>
            <span class="bars">${Array.from({ length: focus.subs }, (_, i) => `<i class="${i < x.solved ? "done" : ""}"></i>`).join("")}</span>
            <span class="pts">${x.score} pts</span></div>`;
        }).join("");

    $("#hRank").innerHTML = `<table><thead><tr><th></th><th>Equipo</th>${session.locks.map(l => `<th class="n" style="color:${l.color}">${esc(l.titulo.replace("Candado ", ""))}</th>`).join("")}<th class="n">Total</th></tr></thead>
      <tbody>${board.map((t, i) => `<tr class="${i === 0 && t.total > 0 ? "top1" : ""}"><td class="pos">${i + 1}</td><td>${esc(t.name)}</td>
        ${session.locks.map(l => `<td class="n">${t.locks[l.id].score}${t.locks[l.id].opened ? " 🔓" : ""}</td>`).join("")}
        <td class="n"><b>${t.total}</b></td></tr>`).join("")}</tbody></table>`;
    tick();
  }

  // ---------------- Acciones ----------------
  $("#hLocks").addEventListener("click", async e => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const id = b.dataset.id, act = b.dataset.act;
    try {
      if (act === "start") {
        const l = data.session.locks.find(x => x.id === id);
        if (l.estado === "cerrada" && !confirm("Reiniciar el candado reinicia su cronómetro (el progreso de los equipos se conserva). ¿Continuar?")) return;
        const other = data.session.locks.find(x => x.estado === "activa");
        if (other && !confirm(`${other.titulo} sigue activo y se cerrará. ¿Continuar?`)) return;
        await api("host.start", { ...auth, lockId: id, minutos: +$("#min-" + id).value || 20 });
      } else if (act === "extend") await api("host.extend", { ...auth, lockId: id, minutos: 2 });
      else if (act === "close") { if (!confirm("¿Cerrar el candado ahora?")) return; await api("host.close", { ...auth, lockId: id }); }
      else if (act === "sol") return showSolution(id);
      await poll();
    } catch (err) { toast(err.message); }
  });

  async function showSolution(id) {
    const l = data.session.locks.find(x => x.id === id);
    if (l.estado === "activa" && !confirm("El candado está activo. ¿Mostrar la solución de todas formas? (No la proyectes todavía)")) return;
    try {
      const s = await api("host.solution", { ...auth, lockId: id });
      $("#solTitle").textContent = `${s.titulo} · ${s.grupo} — Solución`;
      $("#solBody").innerHTML = s.html;
      $("#solDlg").showModal();
    } catch (err) { toast(err.message); }
  }
  $("#solClose").addEventListener("click", () => $("#solDlg").close());

  $("#finishBtn").addEventListener("click", async () => {
    if (!confirm("¿Finalizar el juego y mostrar el podio?")) return;
    try { await api("host.finish", auth); podiumShown = false; await poll(); } catch (err) { toast(err.message); }
  });
  $("#fsBtn").addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.();
  });

  // ---------------- Podio ----------------
  function renderPodium() {
    show("hPodium");
    const b = data.board;
    const slot = (t, cls, n) => t ? `<div class="p ${cls}"><div class="nm">${esc(t.name)}</div><div class="sc">${t.total} pts</div><div class="bar">${n}</div></div>` : "";
    $("#podium").innerHTML = slot(b[1], "p2", 2) + slot(b[0], "p1", 1) + slot(b[2], "p3", 3);
    $("#podiumRest").innerHTML = b.length > 3
      ? `<ol start="4" style="margin:0;padding-left:26px">${b.slice(3).map(t => `<li style="padding:4px 0">${esc(t.name)} — <span class="mono">${t.total}</span></li>`).join("")}</ol>`
      : `<p class="muted" style="margin:0;text-align:center">${b.length ? "¡Felicitaciones a todos los equipos!" : "No participaron equipos."}</p>`;
    confetti();
  }
  $("#backBoard").addEventListener("click", () => { show("hBoard"); render(); });

  // ---------------- Reloj ----------------
  function tick() {
    document.querySelectorAll("[data-ends]").forEach(el => {
      if (!el.dataset.ends) { el.textContent = "--:--"; el.classList.remove("low"); return; }
      const ms = +el.dataset.ends - now();
      el.textContent = mmss(ms);
      el.classList.toggle("low", ms < 120000 && ms > 0);
    });
  }
  setInterval(tick, 1000);
  setInterval(() => { if (auth && !document.hidden) poll(); }, POLL_MS);

  if (auth && new URLSearchParams(location.search).has("reanudar")) start();
})();
