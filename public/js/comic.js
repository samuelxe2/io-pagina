// Componentes visuales reutilizables del cómic (sin lógica de juego).
window.COMIC = (() => {
  const { esc } = window.ER;
  const INK = "#05070d";

  // ---------------- Personajes ----------------
  const CAST = {
    ceo:       { rol: "CEO", skin: "#f1c9a0", suit: "#1d2c52", tie: "#ff8a1f", hair: "#c9ced8" },
    cto:       { rol: "Director de Tecnología", skin: "#b9784a", suit: "#0d3b52", tie: "#21e3ff", hair: "#15161c" },
    cfo:       { rol: "Gerente Financiero", skin: "#e2b07e", suit: "#35285a", tie: "#b98cff", hair: "#5a3220" },
    consultor: { rol: "Consultor", skin: "#8a5634", suit: "#0f3a2f", tie: "#39f29a", hair: "#2a1a10" },
    cliente:   { rol: "Cliente", skin: "#f0c08f", suit: "#5b6476", tie: "#9aa6bd", hair: "#7a4a24" },
    tecnico:   { rol: "Técnico", skin: "#c58c5c", suit: "#20304f", tie: "#ff8a1f", hair: "#111" }
  };

  const EYES = {
    neutral: `<circle cx="49" cy="60" r="3.6"/><circle cx="71" cy="60" r="3.6"/>`,
    serio: `<circle cx="49" cy="61" r="3.4"/><circle cx="71" cy="61" r="3.4"/><path d="M41 51l15 2M79 51l-15 2" stroke-width="3.5"/>`,
    preocupado: `<circle cx="49" cy="61" r="3.4"/><circle cx="71" cy="61" r="3.4"/><path d="M41 53l14-5M79 53l-14-5" stroke-width="3.5"/>`,
    urgente: `<circle cx="49" cy="60" r="5.5" fill="#fff" stroke-width="2.5"/><circle cx="49" cy="60" r="2.4"/><circle cx="71" cy="60" r="5.5" fill="#fff" stroke-width="2.5"/><circle cx="71" cy="60" r="2.4"/><path d="M40 49l15-3M80 49l-15-3" stroke-width="3.5"/>`,
    enojado: `<circle cx="49" cy="62" r="3.4"/><circle cx="71" cy="62" r="3.4"/><path d="M41 50l15 6M79 50l-15 6" stroke-width="4"/>`,
    feliz: `<path d="M43 61q6-7 12 0M65 61q6-7 12 0" stroke-width="3.5" fill="none"/>`
  };
  const MOUTH = {
    neutral: `<path d="M52 80h16" stroke-width="3.5"/>`,
    serio: `<path d="M51 81q9-3 18 0" stroke-width="3.5" fill="none"/>`,
    preocupado: `<path d="M50 83q5-5 10 0t10 0" stroke-width="3.5" fill="none"/>`,
    urgente: `<ellipse cx="60" cy="82" rx="7" ry="8" fill="${INK}"/><ellipse cx="60" cy="85" rx="4" ry="3" fill="#e2566b"/>`,
    enojado: `<rect x="49" y="77" width="22" height="9" rx="2" fill="#fff" stroke-width="3"/><path d="M55 77v9M60 77v9M65 77v9" stroke-width="1.5"/>`,
    feliz: `<path d="M48 77q12 14 24 0z" fill="${INK}"/><path d="M52 80q8 5 16 0" fill="#fff" stroke="none"/>`
  };
  const HAIR = {
    ceo: `<path d="M29 56q-1-34 31-34t31 34q-4-15-14-19-10 7-34 4-10 4-14 15z" fill="var(--hair)"/>`,
    cto: `<path d="M29 57q-3-30 31-33 34 3 31 33l-6-13-5 8-6-13-6 10-6-13-6 10-6-12-5 9z" fill="var(--hair)"/>
          <path d="M26 64q0-44 34-44t34 44" stroke="#21e3ff" stroke-width="4.5" fill="none"/>
          <rect x="20" y="58" width="11" height="17" rx="4" fill="#21e3ff"/><path d="M26 74q2 14 18 14" stroke-width="3" fill="none"/>`,
    cfo: `<circle cx="60" cy="21" r="10" fill="var(--hair)"/><path d="M29 59q0-35 31-35t31 35q-10-18-31-18t-31 18z" fill="var(--hair)"/>
          <rect x="40" y="53" width="17" height="13" rx="4" fill="none" stroke-width="3"/><rect x="63" y="53" width="17" height="13" rx="4" fill="none" stroke-width="3"/><path d="M57 59h6" stroke-width="3"/>`,
    consultor: `<path d="M29 58q-2-34 33-34 30 1 29 30-16-1-26-12-8 10-36 16z" fill="var(--hair)"/>`,
    cliente: `<path d="M30 58q0-34 30-34t30 34q-8-10-30-12-22 2-30 12z" fill="var(--hair)"/>`,
    tecnico: `<path d="M28 56q2-32 32-32t32 32h-64z" fill="#ff8a1f"/><path d="M24 56h72" stroke-width="5"/>`
  };

  function char(kind = "ceo", mood = "neutral", size = 110) {
    const c = CAST[kind] || CAST.ceo;
    return `<svg class="char char-${kind}" width="${size}" height="${size * 1.17}" viewBox="0 0 120 140" style="--hair:${c.hair}" aria-hidden="true">
      <g stroke="${INK}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">
        <path d="M8 140q4-38 52-42 48 4 52 42z" fill="${c.suit}"/>
        <path d="M44 99l16 22 16-22z" fill="#eef3ff"/>
        <path d="M56 104h8l3 26-7 8-7-8z" fill="${c.tie}"/>
        ${kind === "consultor" ? `<rect x="78" y="112" width="18" height="13" rx="3" fill="#39f29a"/>` : ""}
        <rect x="52" y="88" width="16" height="14" fill="${c.skin}"/>
        <ellipse cx="25" cy="64" rx="6" ry="9" fill="${c.skin}"/><ellipse cx="95" cy="64" rx="6" ry="9" fill="${c.skin}"/>
        <ellipse cx="60" cy="61" rx="31" ry="35" fill="${c.skin}"/>
        ${HAIR[kind] || ""}
        <g fill="${INK}">${EYES[mood] || EYES.neutral}</g>
        <path d="M60 64l-4 10h6" stroke-width="3" fill="none"/>
        ${MOUTH[mood] || MOUTH.neutral}
        ${mood === "preocupado" || mood === "urgente" ? `<path d="M95 38q4 7 0 11-4-4 0-11z" fill="#7fe3ff" stroke-width="2"/>` : ""}
      </g></svg>`;
  }

  // ---------------- Globos, cuadros y onomatopeyas ----------------
  const bubble = (html, { tipo = "habla", lado = "izq" } = {}) =>
    `<div class="bubble bubble-${tipo} tail-${lado}">${html}</div>`;

  const caption = (html, variante = "") => `<div class="caption ${variante}">${html}</div>`;

  const boom = (texto, color = "naranja", extra = "") =>
    `<div class="boom boom-${color} ${extra}"><span>${esc(texto)}</span></div>`;

  // Personaje con su globo de diálogo
  function speaker(kind, mood, html, { lado = "izq", tipo = "habla", nombre } = {}) {
    const c = CAST[kind] || CAST.ceo;
    return `<div class="speaker speaker-${lado}">
      <figure class="speaker-fig">${char(kind, mood)}<figcaption>${esc(nombre || c.rol)}</figcaption></figure>
      ${bubble(html, { tipo, lado: lado === "izq" ? "izq" : "der" })}
    </div>`;
  }

  // ---------------- Indicadores ----------------
  function gauge(label, valor, max, unidad, { color = "cian", fmt = v => v } = {}) {
    const pct = max ? Math.min(100, (valor / max) * 100) : 0;
    const over = valor > max + 1e-9;
    return `<div class="gauge ${over ? "over" : ""} g-${color}">
      <div class="gauge-top"><span>${esc(label)}</span><b>${fmt(valor)} / ${fmt(max)} ${esc(unidad)}</b></div>
      <div class="gauge-bar"><i style="width:${pct}%"></i></div>
    </div>`;
  }

  const stat = (label, valor, sub = "", color = "cian") =>
    `<div class="stat s-${color}"><small>${esc(label)}</small><b>${valor}</b>${sub ? `<em>${esc(sub)}</em>` : ""}</div>`;

  // ---------------- Ilustraciones de proyectos ----------------
  const ICONS = {
    plataforma: `<rect x="8" y="12" width="48" height="32" rx="4" fill="#0d1b36"/><path d="M14 36l9-9 7 6 11-13 9 8" stroke="#21e3ff" fill="none"/><path d="M24 50h16M32 44v6" />`,
    escudo: `<path d="M32 6l22 8v14c0 15-10 25-22 30C20 53 10 43 10 28V14z" fill="#0d1b36"/><path d="M22 30l7 7 13-14" stroke="#39f29a" fill="none"/>`,
    monitor: `<rect x="6" y="10" width="52" height="34" rx="4" fill="#0d1b36"/><path d="M12 30h8l4-10 6 18 5-12 4 4h13" stroke="#ff8a1f" fill="none"/><path d="M26 50h12M32 44v6"/>`,
    base: `<ellipse cx="32" cy="14" rx="20" ry="7" fill="#0d1b36"/><path d="M12 14v30c0 4 9 7 20 7s20-3 20-7V14" fill="#0d1b36"/><path d="M12 29c0 4 9 7 20 7s20-3 20-7" fill="none" stroke="#21e3ff"/>`,
    servidor: `<rect x="12" y="6" width="40" height="16" rx="3" fill="#0d1b36"/><rect x="12" y="24" width="40" height="16" rx="3" fill="#0d1b36"/><rect x="12" y="42" width="40" height="14" rx="3" fill="#0d1b36"/><circle cx="20" cy="14" r="2.5" fill="#39f29a"/><circle cx="20" cy="32" r="2.5" fill="#39f29a"/><circle cx="20" cy="49" r="2.5" fill="#ff8a1f"/>`,
    engranaje: `<circle cx="32" cy="30" r="15" fill="#0d1b36"/><path d="M32 6v8M32 46v8M8 30h8M48 30h8M15 13l6 6M43 41l6 6M15 47l6-6M43 19l6-6" stroke-width="6"/><circle cx="32" cy="30" r="5" fill="#21e3ff"/>`
  };
  const icon = (name, size = 64) =>
    `<svg class="pic" width="${size}" height="${size}" viewBox="0 0 64 60" aria-hidden="true"><g stroke="${INK}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" fill="#dfe8ff">${ICONS[name] || ICONS.monitor}</g></svg>`;

  // Expediente de un proyecto
  function dossier(p, { extra = "", estado = "", unidad = "" } = {}) {
    return `<article class="dossier ${estado}" data-cod="${esc(p.cod)}">
      <div class="dossier-tab">EXPEDIENTE ${esc(p.cod)}</div>
      <div class="dossier-pic">${icon(p.icon)}</div>
      <h4>${esc(p.nombre)}</h4>
      ${p.desc ? `<p>${esc(p.desc)}</p>` : ""}
      <div class="dossier-stats">
        <span><small>Costo${unidad}</small><b>$${p.costo} M</b></span>
        <span><small>Horas${unidad}</small><b>${p.horas} h</b></span>
        <span><small>Beneficio${unidad}</small><b>$${p.beneficio} M</b></span>
      </div>
      ${p.max ? `<div class="dossier-max">Máximo: ${p.max}</div>` : ""}
      ${extra}
    </article>`;
  }

  // ---------------- Episodios ----------------
  const EPISODES = ["La crisis", "La junta", "Análisis", "El desafío", "Consecuencias", "Informe"];
  const episodes = cur => `<nav class="episodes" aria-label="Progreso de la misión">
    ${EPISODES.map((t, i) => `<span class="ep ${i + 1 < cur ? "done" : i + 1 === cur ? "cur" : ""}" title="Episodio ${i + 1}: ${t}"><i>${i + 1}</i><em>${t}</em></span>`).join("")}
  </nav>`;
  const epTitle = n => `EPISODIO ${n} · ${EPISODES[n - 1].toUpperCase()}`;

  // ---------------- Escenas ilustradas (portada) ----------------
  const sceneDown = () => `<svg viewBox="0 0 320 200" class="scene" aria-label="Plataforma de transacciones caída">
    <g stroke="${INK}" stroke-width="4" stroke-linejoin="round">
      <rect x="40" y="20" width="240" height="140" rx="10" fill="#0b1634"/>
      <rect x="54" y="34" width="212" height="112" rx="4" fill="#3a0d17"/>
      <path d="M140 160h40l10 24h-60z" fill="#1d2c52"/>
      <path d="M70 60l40 22 30-14 40 40 36-6" stroke="#ff8a1f" stroke-width="5" fill="none"/>
      <path d="M232 98l14 4-4 14" stroke="#ff8a1f" stroke-width="5" fill="none"/>
    </g>
    <text x="160" y="76" text-anchor="middle" class="scene-err">ERROR 503</text>
    <text x="160" y="96" text-anchor="middle" class="scene-sub">PLATAFORMA DE TRANSACCIONES FUERA DE SERVICIO</text>
    <g stroke="#ffd23f" stroke-width="4" stroke-linecap="round"><path d="M30 30l-14-10M28 52l-18 2M290 36l16-12M292 60l18 0"/></g>
  </svg>`;

  const sceneClients = () => `<div class="scene-chars">
    <div class="mini">${char("cliente", "enojado", 74)}${bubble("¡No puedo pagar!", { tipo: "grito" })}</div>
    <div class="mini">${char("cliente", "preocupado", 74)}${bubble("¿Otra vez caído?")}</div>
  </div>`;

  const sceneTech = () => `<div class="scene-chars">
    <div class="mini">${char("tecnico", "urgente", 80)}</div>
    <svg viewBox="0 0 90 120" width="80" aria-hidden="true"><g stroke="${INK}" stroke-width="4">
      <rect x="10" y="6" width="70" height="108" rx="6" fill="#0d1b36"/>
      ${[0, 1, 2, 3].map(i => `<rect x="18" y="${16 + i * 24}" width="54" height="16" rx="3" fill="#1d2c52"/><circle cx="28" cy="${24 + i * 24}" r="3" fill="${i % 2 ? "#ff3b5c" : "#ff8a1f"}"/>`).join("")}
    </g><path d="M70 10l12-8M78 22l12 2" stroke="#ffd23f" stroke-width="4" stroke-linecap="round"/></svg>
  </div>`;

  const sceneDash = () => `<svg viewBox="0 0 220 130" class="scene" aria-label="Tablero de indicadores en alerta">
    <g stroke="${INK}" stroke-width="3.5">
      <rect x="6" y="6" width="208" height="118" rx="8" fill="#0b1634"/>
      ${[70, 56, 44, 30, 18].map((h, i) => `<rect x="${24 + i * 26}" y="${104 - h}" width="18" height="${h}" fill="${i < 2 ? "#ff8a1f" : "#ff3b5c"}"/>`).join("")}
      <circle cx="176" cy="34" r="16" fill="#ff3b5c"/><circle cx="176" cy="78" r="16" fill="#ff8a1f"/>
    </g>
    <text x="176" y="39" text-anchor="middle" class="scene-mark">!</text><text x="176" y="83" text-anchor="middle" class="scene-mark">!</text>
  </svg>`;

  // Tendencia antes / después (consecuencias)
  const trend = up => `<svg viewBox="0 0 200 90" class="trend ${up ? "up" : "down"}" aria-hidden="true">
    <g stroke="${INK}" stroke-width="3"><rect x="2" y="2" width="196" height="86" rx="8" fill="#0b1634"/></g>
    <path class="trend-line" d="${up ? "M14 74 L54 62 L88 66 L122 40 L156 34 L188 14" : "M14 18 L54 30 L88 26 L122 52 L156 58 L188 76"}" stroke="${up ? "#39f29a" : "#ff3b5c"}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

  return { CAST, char, bubble, caption, boom, speaker, gauge, stat, icon, dossier, episodes, epTitle, sceneDown, sceneClients, sceneTech, sceneDash, trend };
})();
