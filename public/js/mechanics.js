// Mecánicas visuales de cada desafío. Solo presentan los campos del sub-candado
// (mismos id que valida el servidor); no contienen respuestas ni evaluación.
window.MECH = (() => {
  const { esc } = window.ER;
  const C = window.COMIC;

  // ---------------- Fichas genéricas ----------------
  function token(tok, ctx, variant = "") {
    if (typeof tok === "string") return `<span class="txt">${esc(tok)}</span>`;
    const v = ctx.val(tok.id);
    const bad = ctx.wrong.includes(tok.id) ? "wrong" : "";
    const dis = ctx.disabled ? "disabled" : "";
    if (tok.tipo === "select") {
      return `<div class="chips ${variant} ${bad}" data-chips="${tok.id}">
        <input type="hidden" data-f="${tok.id}" value="${esc(v || "")}">
        ${tok.opciones.map(o => `<button type="button" class="chip ${v === o.v ? "on" : ""}" data-v="${esc(o.v)}" ${dis}>${esc(o.t)}</button>`).join("")}
      </div>`;
    }
    if (tok.tipo === "multi") {
      const set = Array.isArray(v) ? v : [];
      const codes = firstCodes(ctx.L);
      return `<div class="stamps ${bad}" data-multi="${tok.id}">${tok.opciones.map(o => {
        const bits = /^[01]+$/.test(o.v) && codes.length === o.v.length
          ? o.v.split("").map((b, i) => (b === "1" ? codes[i] : null)).filter(Boolean).join(" + ") || "Ninguno" : "";
        return `<label class="stamp-card"><input type="checkbox" value="${esc(o.v)}" ${set.includes(o.v) ? "checked" : ""} ${dis}>
          <span class="sc-body"><b>${esc(o.t)}</b>${bits ? `<small>${esc(bits)}</small>` : ""}<i class="sc-stamp">INFACTIBLE</i></span></label>`;
      }).join("")}</div>`;
    }
    return `<input class="cell ${bad}" data-f="${tok.id}" value="${esc(v || "")}" placeholder="${esc(tok.ph || "?")}" autocapitalize="off" autocomplete="off" spellcheck="false" inputmode="text" ${dis}>`;
  }
  const firstCodes = L => { const g = Object.values(L.proyectos || {})[0] || []; return g.map(p => p.cod); };
  const rows = (filas, ctx, variant) => filas.map(f => `<div class="fila">${f.map(t => token(t, ctx, variant)).join("")}</div>`).join("");
  const fieldsOf = filas => filas.flat().filter(t => typeof t === "object");

  // ---------------- Mecánicas ----------------
  const R = {
    ecuacion: (s, ctx) => `<div class="board blueprint"><div class="board-label">PIZARRA DEL MODELO</div>${rows(s.filas, ctx)}</div>`,

    terminal: (s, ctx) => `<div class="terminal"><div class="term-bar"><i></i><i></i><i></i><span>simplex — relajación lineal</span></div>
      <div class="term-body"><div class="term-line">&gt; resolver --sin-integralidad</div>${rows(s.filas, ctx)}<div class="term-line blink">█</div></div></div>`,

    corte: (s, ctx) => `<div class="board blueprint cut"><div class="board-label">✂ PLANO DE CORTE DE GOMORY</div>${rows(s.filas, ctx)}
      <p class="board-note">Se acepta el corte multiplicado por cualquier constante positiva.</p></div>`,

    dual: (s, ctx) => `<div class="board dual">${s.filas.map(f => {
      const sel = f.find(t => typeof t === "object" && t.tipo === "select");
      if (sel) return `<div class="dual-q">${f.filter(t => typeof t === "string").map(esc).join(" ")}</div>${token(sel, ctx, "vars")}`;
      return `<div class="fila">${f.map(t => token(t, ctx)).join("")}</div>`;
    }).join("")}</div>`,

    clave: (s, ctx) => `<div class="vault"><div class="vault-ring">${s.filas.map(f => `<div class="fila dials">${f.map(t => token(t, ctx)).join("")}</div>`).join("")}</div>
      <div class="vault-label">COMBINACIÓN DEL CANDADO</div></div>`,

    sellos: (s, ctx) => `<div class="board sellos">${s.filas.map(f => {
      const m = f.find(t => typeof t === "object" && t.tipo === "multi");
      if (m) return token(m, ctx);
      if (f.length === 1 && typeof f[0] === "string") return C.caption(esc(f[0]), "small");
      return `<div class="fila">${f.map(t => token(t, ctx)).join("")}</div>`;
    }).join("")}<p class="board-note">Toca una combinación para sellarla; tócala de nuevo para quitar el sello.</p></div>`,

    expediente: (s, ctx) => {
      const ps = (ctx.L.proyectos[s.ui.grupo] || []).filter(p => s.ui.destacar.includes(p.cod));
      return `<div class="combo">${ps.map((p, i) => (i ? `<div class="combo-plus">+</div>` : "") + C.dossier(p)).join("")}</div>
        <div class="board calc"><div class="board-label">CALCULADORA DEL CFO</div>${rows(s.filas, ctx)}</div>`;
    },

    dialogo: (s, ctx) => {
      const who = ["cfo", "cto"];
      let q = 0;
      return `<div class="dialog">${s.filas.map(f => {
        const sel = f.find(t => typeof t === "object" && t.tipo === "select");
        if (sel) return token(sel, ctx, "answers");
        const k = who[q++ % who.length];
        return C.speaker(k, "serio", esc(f.filter(t => typeof t === "string").join(" ")), { lado: q % 2 ? "izq" : "der" });
      }).join("")}</div>`;
    },

    tablero: (s, ctx) => {
      const u = s.ui, ps = ctx.L.proyectos[u.grupo] || [];
      const cards = ps.map((p, i) => {
        const id = u.vars[i], v = ctx.val(id);
        const ctrl = u.tipo === "entero"
          ? `<div class="stepper"><button type="button" data-step="-1" data-var="${id}" ${ctx.disabled ? "disabled" : ""}>−</button>
              <output data-out="${id}">${v === undefined || v === "" ? 0 : esc(v)}</output>
              <button type="button" data-step="1" data-var="${id}" data-max="${p.max || 99}" ${ctx.disabled ? "disabled" : ""}>+</button></div>`
          : `<div class="decide"><button type="button" class="yes" data-set="1" data-var="${id}" ${ctx.disabled ? "disabled" : ""}>IMPLEMENTAR</button>
              <button type="button" class="no" data-set="0" data-var="${id}" ${ctx.disabled ? "disabled" : ""}>DESCARTAR</button></div>`;
        const est = v === "1" || (u.tipo === "entero" && +v > 0) ? "on" : v === "0" ? "off" : "";
        return C.dossier(p, { estado: est, unidad: u.tipo === "entero" ? "/u" : "",
          extra: `<input type="hidden" data-f="${id}" value="${esc(u.tipo === "entero" ? (v === undefined || v === "" ? "0" : v) : v || "")}">${ctrl}<i class="dossier-stamp"></i>` });
      }).join("");
      return `<div class="decision">
        <div class="dossiers">${cards}</div>
        <aside class="resources" data-board>
          <div class="res-title">TABLERO DE RECURSOS</div>
          <div data-gauges></div>
          <div class="res-alert" data-alert></div>
          <input type="hidden" data-f="${u.z}" value="">
        </aside></div>`;
    }
  };

  function render(s, ctx) {
    const mec = (s.ui && s.ui.mec) || "ecuacion";
    return (R[mec] || R.ecuacion)(s, ctx);
  }

  // ---------------- Interacción ----------------
  function bind(root, s, ctx, onChange) {
    root.querySelectorAll("[data-chips]").forEach(g => g.addEventListener("click", e => {
      const b = e.target.closest(".chip");
      if (!b || b.disabled) return;
      g.querySelectorAll(".chip").forEach(x => x.classList.toggle("on", x === b));
      const h = g.querySelector("input[type=hidden]");
      h.value = b.dataset.v;
      g.classList.remove("wrong");
      b.classList.add("pop");
      onChange(h.dataset.f, h.value);
    }));
    if (s.ui && s.ui.mec === "tablero") bindBoard(root, s, ctx, onChange);
  }

  function bindBoard(root, s, ctx, onChange) {
    const u = s.ui, ps = ctx.L.proyectos[u.grupo] || [], lim = ctx.L.limites;
    const input = id => root.querySelector(`input[data-f="${id}"]`);
    function update(animCard) {
      const x = u.vars.map(id => input(id).value);
      const decided = x.every(v => v !== "");
      const n = x.map(v => +v || 0);
      const cost = ps.reduce((a, p, i) => a + p.costo * n[i], 0);
      const hours = ps.reduce((a, p, i) => a + p.horas * n[i], 0);
      const ben = ps.reduce((a, p, i) => a + p.beneficio * n[i], 0);
      input(u.z).value = decided ? String(ben) : "";
      ps.forEach((p, i) => {
        const card = root.querySelector(`.dossier[data-cod="${p.cod}"]`);
        const on = u.tipo === "entero" ? n[i] > 0 : x[i] === "1";
        const off = u.tipo === "entero" ? false : x[i] === "0";
        card.classList.toggle("on", on);
        card.classList.toggle("off", off);
        const st = card.querySelector(".dossier-stamp");
        st.textContent = on ? (u.tipo === "entero" ? `× ${n[i]}` : "APROBADO") : off ? "DESCARTADO" : "";
        if (animCard === p.cod) { card.classList.remove("flash"); void card.offsetWidth; card.classList.add("flash"); }
      });
      const okB = cost <= lim.presupuesto + 1e-9, okH = hours <= lim.horas + 1e-9;
      const sel = ps.map((p, i) => (n[i] > 0 ? (u.tipo === "entero" ? `${n[i]}× ${p.cod}` : p.cod) : null)).filter(Boolean);
      root.querySelector("[data-gauges]").innerHTML =
        C.gauge("Presupuesto consumido", cost, lim.presupuesto, "M", { color: "cian", fmt: v => "$" + v }) +
        C.gauge("Horas utilizadas", hours, lim.horas, "h", { color: "naranja" }) +
        `<div class="res-benefit"><small>Beneficio económico acumulado</small><b>$${ben} M</b></div>
         <div class="res-checks"><span class="${okB ? "ok" : "ko"}">${okB ? "✔" : "✖"} Presupuesto</span><span class="${okH ? "ok" : "ko"}">${okH ? "✔" : "✖"} Horas</span></div>
         <div class="res-sel"><small>Proyectos seleccionados</small><b>${sel.length ? esc(sel.join(" + ")) : "Ninguno"}</b></div>`;
      const al = root.querySelector("[data-alert]");
      if (!okH && !okB) al.innerHTML = C.boom("¡SOBRECARGA!", "rojo") + `<p>La combinación excede el presupuesto y la capacidad del equipo técnico.</p>`;
      else if (!okH) al.innerHTML = C.boom("¡SOBRECARGA!", "rojo") + `<p>El equipo técnico no tiene capacidad para ejecutar todos los proyectos seleccionados.</p>`;
      else if (!okB) al.innerHTML = C.boom("¡SIN FONDOS!", "rojo") + `<p>La combinación supera los $${lim.presupuesto} millones autorizados por la junta.</p>`;
      else if (!decided) al.innerHTML = `<p class="muted">${u.tipo === "entero" ? "Ajusta las cantidades de cada paquete." : "Decide IMPLEMENTAR o DESCARTAR en cada expediente."}</p>`;
      else al.innerHTML = C.boom("¡BUENA DECISIÓN!", "verde") + `<p>La combinación seleccionada se encuentra dentro de los recursos disponibles.</p>`;
      al.className = "res-alert " + (!okB || !okH ? "bad" : decided ? "good" : "");
    }
    root.addEventListener("click", e => {
      const b = e.target.closest("[data-set],[data-step]");
      if (!b || b.disabled) return;
      const id = b.dataset.var, inp = input(id);
      if (b.dataset.set !== undefined) inp.value = b.dataset.set;
      else {
        const nv = Math.max(0, Math.min(+b.dataset.max || 99, (+inp.value || 0) + +b.dataset.step));
        inp.value = String(nv);
        root.querySelector(`[data-out="${id}"]`).textContent = nv;
      }
      onChange(id, inp.value);
      update(b.closest(".dossier").dataset.cod);
      onChange(u.z, input(u.z).value);
    });
    update();
  }

  return { render, bind, fieldsOf };
})();
