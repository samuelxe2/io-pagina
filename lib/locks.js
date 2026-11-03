// =====================================================================
//  CANDADOS DEL ESCAPE ROOM (solo servidor: aquí están las respuestas)
//  Grupo 1 → Pura · Grupo 2 → Mixta (planos de corte) · Grupo 3 → Binaria
// =====================================================================
const { parseNum, near, isInt } = require("./num");

// ---- Constructores de campos (lo que ve el estudiante) ----
const n = (id, ph = "") => ({ id, tipo: "num", ph });
const sel = (id, opciones) => ({ id, tipo: "select", opciones: opciones.map(o => (typeof o === "string" ? { v: o, t: o } : o)) });
const multi = (id, opciones) => ({ id, tipo: "multi", opciones: opciones.map(o => (typeof o === "string" ? { v: o, t: o } : o)) });

// ---- Validadores ----
// Compara cada campo con su respuesta; extra(vals, nums, wrong) puede dar retroalimentación específica.
function exact(answers, extra) {
  return vals => {
    const wrong = [];
    const nums = {};
    for (const [id, ans] of Object.entries(answers)) {
      const v = vals[id];
      if (Array.isArray(ans)) {
        const got = (Array.isArray(v) ? v : []).map(String).sort().join("|");
        if (got !== [...ans].sort().join("|")) wrong.push(id);
      } else if (typeof ans === "number") {
        nums[id] = parseNum(v);
        if (!near(nums[id], ans)) wrong.push(id);
      } else if (String(v) !== ans) wrong.push(id);
    }
    if (!wrong.length) return { ok: true };
    const msg = extra && extra(vals, nums, wrong);
    return { ok: false, wrong, msg: msg || `Hay ${wrong.length} valor(es) incorrecto(s). Revisa los campos marcados.` };
  };
}

// Corte de Gomory: se acepta cualquier múltiplo positivo de los coeficientes.
function proportional(ids, target, extra) {
  return vals => {
    const v = ids.map(id => parseNum(vals[id]));
    if (v.some(x => !Number.isFinite(x))) return { ok: false, msg: "Completa todos los coeficientes con números o fracciones." };
    const last = ids.length - 1;
    const k = v[last] / target[last];
    const ok = k > 0 && v.every((x, i) => Math.abs(x - k * target[i]) <= 0.011 * Math.max(1, k));
    return ok ? { ok: true } : { ok: false, msg: (extra && extra(v)) || "El corte no es correcto. Revisa la fila de la variable fraccionaria." };
  };
}

// Clave final: valida dominio, restricciones, coherencia de Z y optimalidad (sin revelar campos).
function solucion({ vars, c, cons, dominio, zOpt, antes }) {
  return vals => {
    const x = vars.map(id => parseNum(vals[id]));
    const z = parseNum(vals.z);
    if (x.some(v => !Number.isFinite(v)) || !Number.isFinite(z)) return { ok: false, msg: "Completa todos los campos con números." };
    if (x.some(v => v < -1e-9)) return { ok: false, msg: "Las variables no pueden ser negativas." };
    const pre = antes && antes(x, z);
    if (pre) return { ok: false, msg: pre };
    const d = dominio(x);
    if (d) return { ok: false, msg: d };
    for (const r of cons) {
      const lhs = r.a.reduce((s, a, i) => s + a * x[i], 0);
      if (lhs > r.b + 1e-6) return { ok: false, msg: `${r.msg} (${+lhs.toFixed(3)} > ${r.b}).` };
    }
    const zc = c.reduce((s, a, i) => s + a * x[i], 0);
    if (!near(z, zc)) return { ok: false, msg: "Revisa tu función objetivo: Z no coincide con los valores de las variables." };
    if (zc < zOpt - 0.011) return { ok: false, msg: "Es factible, pero existe una mejor solución." };
    return { ok: true };
  };
}

const binario = x => (x.every(v => v === 0 || v === 1) ? null : "Las variables deben ser binarias (0 o 1).");

// ---- Datos de proyectos (públicos: son los mismos de las tablas del enunciado) ----
// desc solo donde el material del grupo lo describe; icon es puramente visual.
const PROY = {
  pura1: [
    { cod: "P1", nombre: "Estabilización de la plataforma transaccional", costo: 50, horas: 24, beneficio: 70, icon: "plataforma" },
    { cod: "P2", nombre: "Refuerzo de ciberseguridad", costo: 40, horas: 20, beneficio: 30, icon: "escudo" },
    { cod: "P3", nombre: "Monitoreo y continuidad del servicio", costo: 30, horas: 16, beneficio: 45, icon: "monitor" }
  ],
  pura2: [
    { cod: "A", nombre: "Optimización de transacciones", desc: "Intervención de optimización de transacciones (paquete repetible).", costo: 20, horas: 12, beneficio: 34, max: 3, icon: "engranaje" },
    { cod: "B", nombre: "Módulo de monitoreo de servicios", desc: "Instalación y configuración de módulos de monitoreo.", costo: 15, horas: 8, beneficio: 23, max: 4, icon: "monitor" }
  ],
  mixta: [
    { cod: "P1", nombre: "Optimización de la base de datos transaccional", desc: "Desarrollo de software modular, con tope de 1 intervención completa (X₁ ≤ 1).", costo: 40, horas: 20, beneficio: 75, icon: "base", tipo: "continua", max: 1 },
    { cod: "P2", nombre: "Infraestructura de respaldo y conmutación automática", desc: "Requiere servidores físicos indivisibles: X₂ entera.", costo: 55, horas: 28, beneficio: 90, icon: "servidor", tipo: "entera" },
    { cod: "P3", nombre: "Automatización del monitoreo y respuesta a incidentes", desc: "Desarrollo de software gradual y modular: X₃ continua.", costo: 30, horas: 16, beneficio: 52, icon: "monitor", tipo: "continua" }
  ],
  binaria: [
    { cod: "P1", nombre: "Optimización de la base de datos transaccional", desc: "Mejora el rendimiento de la base de datos transaccional.", costo: 40, horas: 20, beneficio: 75, icon: "base" },
    { cod: "P2", nombre: "Infraestructura de respaldo y recuperación automática", desc: "Implementa respaldo y recuperación automática ante fallas.", costo: 55, horas: 28, beneficio: 90, icon: "servidor" },
    { cod: "P3", nombre: "Monitoreo automatizado y respuesta a incidentes", desc: "Detecta incidentes y activa respuestas automáticas.", costo: 30, horas: 16, beneficio: 52, icon: "monitor" }
  ]
};
const LIM = { presupuesto: 85, horas: 44 };
const fila = p => [`${p.cod} · ${p.nombre}`, p.costo, p.horas, p.beneficio];

// =====================================================================
const LOCKS = {
  // ------------------------------------------------------------------
  pura: {
    id: "pura",
    orden: 1,
    grupo: "Grupo 1",
    titulo: "Candado PURA",
    subtitulo: "Programación Entera Pura",
    color: "#4fd1ff",
    bonusMin: 15,
    quien: "cto",
    proyectos: { ej1: PROY.pura1, ej2: PROY.pura2 },
    limites: LIM,
    consecuencias: { sub: "E", grupo: "ej2", vars: ["x1", "x2"], z: "z", unidad: "paquete" },
    resumen: "Ej. 1: P1 + P3 → Z = 115 M (80 M · 40 h). Ej. 2: 1 paquete A + 4 paquetes B → Z = 126 M (80 M · 44 h).",
    historia: "La sala de servidores está sellada. Para entrar, el equipo debe demostrar que domina los modelos en los que <b>todas</b> las variables son enteras.",
    enunciado: `<p><b>Ejercicio 1. Selección de proyectos.</b> Cada proyecto se ejecuta completo o se descarta. Presupuesto: <b>$85 M</b>. Horas técnicas: <b>44 h</b>.</p>`,
    tablas: [
      {
        titulo: "Ejercicio 1 — Proyectos",
        cols: ["Proyecto", "Costo (M)", "Horas", "Beneficio (M)"],
        rows: PROY.pura1.map(fila)
      },
      {
        titulo: "Ejercicio 2 — Paquetes repetibles (x = paquetes A, y = paquetes B)",
        cols: ["Paquete", "Costo/u (M)", "Horas/u", "Beneficio/u (M)", "Máximo"],
        rows: PROY.pura2.map(p => [...fila(p), p.max])
      }
    ],
    subs: [
      {
        id: "A",
        titulo: "Modelo del ejercicio 1",
        ui: { mec: "ecuacion", quien: "cto", animo: "preocupado", dice: "Antes de gastar un peso necesitamos el modelo. Si un proyecto se ejecuta completo o se descarta, ¿qué valores puede tomar cada variable?" },
        descripcion: "Define el tipo de variable y escribe la función objetivo y las restricciones.",
        filas: [
          ["Dominio de las variables:", sel("dom", [
            { v: "cont", t: "Continuas  x ≥ 0" }, { v: "ent", t: "Enteras  x ∈ ℤ⁺" }, { v: "bin", t: "Binarias  x ∈ {0, 1}" }])],
          ["Max Z =", n("c1"), "x₁ +", n("c2"), "x₂ +", n("c3"), "x₃"],
          [n("a1"), "x₁ +", n("a2"), "x₂ +", n("a3"), "x₃ ≤", n("b1"), "(presupuesto)"],
          [n("h1"), "x₁ +", n("h2"), "x₂ +", n("h3"), "x₃ ≤", n("b2"), "(horas)"]
        ],
        check: exact({ dom: "bin", c1: 70, c2: 30, c3: 45, a1: 50, a2: 40, a3: 30, b1: 85, h1: 24, h2: 20, h3: 16, b2: 44 },
          (v, _, w) => (w.includes("dom") ? "Cada proyecto se ejecuta completo o se descarta: ¿qué valores puede tomar xᵢ?" : null))
      },
      {
        id: "B",
        titulo: "Enumeración de combinaciones",
        ui: { mec: "sellos", quien: "cfo", animo: "serio", dice: "Quiero ver las 2ⁿ combinaciones del ejercicio 1. Sella como INFACTIBLE cada una que nuestros recursos no soportan." },
        descripcion: "Evalúa todas las combinaciones (x₁x₂x₃) del ejercicio 1.",
        filas: [
          ["Combinaciones posibles:", n("tot")],
          ["Combinaciones factibles:", n("fac")],
          ["Marca las combinaciones que NO son factibles:"],
          [multi("inf", ["000", "001", "010", "011", "100", "101", "110", "111"])]
        ],
        check: exact({ tot: 8, fac: 6, inf: ["110", "111"] })
      },
      {
        id: "C",
        titulo: "Solución óptima del ejercicio 1",
        ui: { mec: "tablero", quien: "ceo", animo: "urgente", grupo: "ej1", vars: ["x1", "x2", "x3"], z: "z", tipo: "binario", dice: "Decide qué proyectos implementamos. No hay medias tintas: completo o descartado." },
        descripcion: "Ingresa la combinación óptima y su beneficio.",
        filas: [["x₁ =", n("x1"), "x₂ =", n("x2"), "x₃ =", n("x3")], ["Z =", n("z"), "millones COP"]],
        check: solucion({
          vars: ["x1", "x2", "x3"], c: [70, 30, 45], zOpt: 115, dominio: binario,
          cons: [{ a: [50, 40, 30], b: 85, msg: "Excede el presupuesto" }, { a: [24, 20, 16], b: 44, msg: "Excede las horas técnicas" }]
        })
      },
      {
        id: "D",
        titulo: "Modelo del ejercicio 2",
        ui: { mec: "ecuacion", quien: "cto", animo: "serio", dice: "Ahora el plan operativo: paquetes repetibles A y B, cada uno con un máximo. Escribe su modelo entero." },
        descripcion: "x = paquetes A, y = paquetes B (enteros no negativos).",
        filas: [
          ["Max Z =", n("c1"), "x +", n("c2"), "y"],
          [n("a1"), "x +", n("a2"), "y ≤", n("b1"), "(presupuesto)"],
          [n("h1"), "x +", n("h2"), "y ≤", n("b2"), "(horas)"],
          ["x ≤", n("ux"), "  y ≤", n("uy"), "  x, y enteros ≥ 0"]
        ],
        check: exact({ c1: 34, c2: 23, a1: 20, a2: 15, b1: 85, h1: 12, h2: 8, b2: 44, ux: 3, uy: 4 })
      },
      {
        id: "E",
        titulo: "Clave final — ejercicio 2",
        ui: { mec: "tablero", quien: "ceo", animo: "urgente", grupo: "ej2", vars: ["x1", "x2"], z: "z", tipo: "entero", dice: "¿Cuántos paquetes de cada tipo ejecutamos? Esa cantidad es la clave del candado." },
        descripcion: "Ingresa la solución entera óptima. Es la clave que abre el candado.",
        filas: [["x =", n("x1"), "y =", n("x2")], ["Z =", n("z"), "millones COP"]],
        check: solucion({
          vars: ["x1", "x2"], c: [34, 23], zOpt: 126,
          dominio: x => (!x.every(isInt) ? "x e y deben ser enteros: los paquetes son indivisibles." : x[0] > 3 ? "x no puede superar 3 paquetes." : x[1] > 4 ? "y no puede superar 4 paquetes." : null),
          cons: [{ a: [20, 15], b: 85, msg: "Excede el presupuesto" }, { a: [12, 8], b: 44, msg: "Excede las horas técnicas" }]
        })
      }
    ],
    pistas: [
      { costo: 10, texto: "En el ejercicio 1 cada proyecto vale 0 o 1, así que hay 2³ combinaciones. Suma costo y horas de cada una." },
      { costo: 15, texto: "En el ejercicio 1 solo fallan las combinaciones que incluyen P1 y P2 a la vez (cuestan 90 M o más)." },
      { costo: 25, texto: "En el ejercicio 2 la mejor solución consume exactamente las 44 horas y usa pocos paquetes A." }
    ],
    solucion: `
      <h3>Ejercicio 1 (binario)</h3>
      <p>Max Z = 70x₁ + 30x₂ + 45x₃ · s.a. 50x₁ + 40x₂ + 30x₃ ≤ 85 · 24x₁ + 20x₂ + 16x₃ ≤ 44 · xᵢ ∈ {0,1}</p>
      <p>8 combinaciones; infactibles: 110 (90 M) y 111 (120 M). <b>Óptimo: x = (1, 0, 1), Z = 115 M</b> · usa 80 M y 40 h.</p>
      <h3>Ejercicio 2 (entero)</h3>
      <p>Max Z = 34x + 23y · s.a. 20x + 15y ≤ 85 · 12x + 8y ≤ 44 · x ≤ 3, y ≤ 4 · enteros</p>
      <p><b>Óptimo: x = 1, y = 4, Z = 126 M</b> · usa 80 M y las 44 h (le sigue x = 3, y = 1 con 125 M).</p>`
  },

  // ------------------------------------------------------------------
  mixta: {
    id: "mixta",
    orden: 2,
    grupo: "Grupo 2",
    titulo: "Candado MIXTA",
    subtitulo: "Entera mixta · Planos de corte",
    color: "#b388ff",
    bonusMin: 15,
    quien: "cto",
    proyectos: { p: PROY.mixta },
    limites: LIM,
    consecuencias: { sub: "E", grupo: "p", vars: ["x1", "x2", "x3"], z: "z", unidad: "unidad" },
    resumen: "Relajación Z = 1635/11 ≈ 148,64 → corte de Gomory → simplex dual → Z = 153 M con X₁ = 1, X₂ = 0, X₃ = 3/2 (85 M · 44 h).",
    historia: "El centro de datos tiene un candado híbrido: unas piezas son indivisibles y otras no. Solo el método de <b>planos de corte</b> lo abre.",
    enunciado: `<p>P2 requiere servidores físicos indivisibles: <b>X₂ entera</b>. P1 (tope de 1 intervención, <b>X₁ ≤ 1</b>) y P3 son software modular: <b>X₁ y X₃ continuas</b>. Presupuesto <b>$85 M</b>, horas <b>44 h</b>.</p>
      <p>Estandarizado: X₄ = holgura del presupuesto, X₅ = holgura de horas, X₆ = holgura de X₁ ≤ 1.</p>`,
    tablas: [{
      titulo: "Proyectos",
      cols: ["Proyecto", "Costo (M)", "Horas", "Beneficio (M)"],
      rows: [
        ["P1 · Optimización de la base de datos (X₁ ≤ 1, continua)", 40, 20, 75],
        ["P2 · Infraestructura de respaldo (X₂ entera)", 55, 28, 90],
        ["P3 · Automatización del monitoreo (X₃ continua)", 30, 16, 52]
      ]
    }],
    subs: [
      {
        id: "A",
        titulo: "Modelo",
        ui: { mec: "ecuacion", quien: "cto", animo: "preocupado", dice: "Este candado es híbrido: hay hardware que no se puede partir y software que sí. ¿Qué variable debe ser entera?" },
        descripcion: "Identifica la variable entera y escribe el modelo.",
        filas: [
          ["¿Qué variable debe ser entera por requerir hardware indivisible?", sel("ent", ["X1", "X2", "X3"])],
          ["Max Z =", n("c1"), "X₁ +", n("c2"), "X₂ +", n("c3"), "X₃"],
          [n("a1"), "X₁ +", n("a2"), "X₂ +", n("a3"), "X₃ ≤", n("b1"), "(presupuesto)"],
          [n("h1"), "X₁ +", n("h2"), "X₂ +", n("h3"), "X₃ ≤", n("b2"), "(horas)"],
          [n("t1"), "X₁ ≤", n("t2"), "(tope de P1)"]
        ],
        check: exact({ ent: "X2", c1: 75, c2: 90, c3: 52, a1: 40, a2: 55, a3: 30, b1: 85, h1: 20, h2: 28, h3: 16, b2: 44, t1: 1, t2: 1 })
      },
      {
        id: "B",
        titulo: "Relajación lineal",
        ui: { mec: "terminal", quien: "cto", animo: "serio", dice: "Corre la relajación lineal: resuelve el simplex sin exigir todavía que X₂ sea entera." },
        descripcion: "Resuelve sin exigir integralidad (tablero óptimo continuo). Se aceptan fracciones, ej. 9/11.",
        filas: [["Z =", n("z", "ej. 1635/11"), "X₁ =", n("x1"), "X₂ =", n("x2"), "X₃ =", n("x3")]],
        check: exact({ z: 1635 / 11, x1: 1, x2: 9 / 11, x3: 0 },
          (v, nums) => (isInt(nums.x2) ? "Revisa: aún no se exige integralidad sobre X₂ en esta etapa." : null))
      },
      {
        id: "C",
        titulo: "Corte de Gomory",
        ui: { mec: "corte", quien: "cfo", animo: "preocupado", dice: "X₂ salió fraccionaria. Necesitamos un plano de corte que elimine esa solución sin perder las factibles." },
        descripcion: "Con la fila de X₂ del tablero óptimo, escribe el corte. Se acepta cualquier múltiplo positivo.",
        filas: [[n("a3"), "X₃ +", n("a4"), "X₄ +", n("a6"), "X₆ ≥", n("b")]],
        check: proportional(["a3", "a4", "a6", "b"], [6 / 11, 1 / 55, 8 / 11, 9 / 11],
          () => "El corte no coincide. X₃, X₄ y X₆ son continuas: en el caso mixto sus coeficientes se conservan completos.")
      },
      {
        id: "D",
        titulo: "Simplex dual",
        ui: { mec: "dual", quien: "cto", animo: "serio", dice: "Con el corte, S₁ quedó negativa en la base. Aplica el simplex dual: ¿quién entra?" },
        descripcion: "Agregado el corte con holgura S₁, S₁ sale de la base por ser negativa.",
        filas: [
          ["¿Qué variable entra a la base?", sel("entra", ["X3", "X4", "X5", "X6"])],
          ["Razón mínima |(Cj − Zj) / aᵢⱼ| =", n("razon", "ej. 8/3")]
        ],
        check: exact({ entra: "X3", razon: 8 / 3 }, (v, nums) =>
          near(nums.razon, 105 / 8) || near(nums.razon, 90) ? "Esa razón corresponde a otra variable; busca la menor." : null)
      },
      {
        id: "E",
        titulo: "Clave final",
        ui: { mec: "clave", quien: "ceo", animo: "urgente", dice: "Ingresa la solución entera mixta óptima. Es la combinación que abre el candado." },
        descripcion: "Solución entera mixta óptima. Es la clave que abre el candado.",
        filas: [["Z =", n("z"), "X₁ =", n("x1"), "X₂ =", n("x2"), "X₃ =", n("x3")]],
        check: solucion({
          vars: ["x1", "x2", "x3"], c: [75, 90, 52], zOpt: 153,
          antes: (x, z) => (near(z, 1635 / 11) ? "Esa es la relajación lineal; falta forzar X₂ entera." : null),
          dominio: x => (!isInt(x[1]) ? "X₂ debe ser entera." : x[0] > 1 + 1e-6 ? "X₁ no puede superar 1 unidad." : null),
          cons: [{ a: [40, 55, 30], b: 85, msg: "Excede el presupuesto" }, { a: [20, 28, 16], b: 44, msg: "Excede las horas técnicas" }]
        })
      }
    ],
    pistas: [
      { costo: 10, texto: "P2 requiere un servidor completo, así que X₂ debe ser entera; P1 tiene tope X₁ ≤ 1." },
      { costo: 15, texto: "Resuelve primero sin integralidad: X₁ satura su tope (X₁ = 1) y X₂ queda en 9/11." },
      { costo: 25, texto: "En la fila de X₂ del tablero óptimo el lado derecho es 9/11 = 0 + 9/11; pasa los coeficientes continuos al otro lado para formar el corte." }
    ],
    solucion: `
      <p>Max Z = 75X₁ + 90X₂ + 52X₃ · s.a. 40X₁ + 55X₂ + 30X₃ ≤ 85 · 20X₁ + 28X₂ + 16X₃ ≤ 44 · X₁ ≤ 1 · X₂ entera</p>
      <p><b>Relajación:</b> Z = 1635/11 ≈ 148,64 · X₁ = 1 · X₂ = 9/11 · X₃ = 0</p>
      <p><b>Corte (fila de X₂):</b> 6/11 X₃ + 1/55 X₄ + 8/11 X₆ ≥ 9/11</p>
      <p><b>Simplex dual:</b> sale S₁; razones X₃ = 8/3, X₆ = 105/8, X₄ = 90 → entra X₃.</p>
      <p><b>Óptimo: Z = 153 M · X₁ = 1 · X₂ = 0 · X₃ = 3/2</b> · usa los 85 M y las 44 h.</p>`
  },

  // ------------------------------------------------------------------
  binaria: {
    id: "binaria",
    orden: 3,
    grupo: "Grupo 3",
    titulo: "Candado BINARIA",
    subtitulo: "Programación Entera Binaria",
    color: "#3ee8a5",
    bonusMin: 15,
    quien: "ceo",
    proyectos: { p: PROY.binaria },
    limites: LIM,
    consecuencias: { sub: "D", grupo: "p", vars: ["x1", "x2", "x3"], z: "z", unidad: "proyecto" },
    resumen: "P2 + P3 → Z = 142 M usando exactamente 85 M y 44 h (ambas restricciones activas). P1 + P3 daría 127 M.",
    historia: "Código rojo: la empresa se está hundiendo. El último candado protege el plan de recuperación: cada proyecto es un <b>sí o un no</b>.",
    enunciado: `<p>Cada proyecto se implementa completo o se descarta. Los beneficios son aditivos y no hay dependencias. Presupuesto <b>$85 M</b>, horas <b>44 h</b>, beneficio medido en 30 días.</p>`,
    tablas: [{
      titulo: "Proyectos",
      cols: ["Código", "Proyecto", "Costo (M)", "Horas", "Beneficio (M)"],
      rows: [
        ["P1", "Optimización de la base de datos transaccional", 40, 20, 75],
        ["P2", "Infraestructura de respaldo y recuperación automática", 55, 28, 90],
        ["P3", "Monitoreo automatizado y respuesta a incidentes", 30, 16, 52]
      ]
    }],
    subs: [
      {
        id: "A",
        titulo: "Modelo binario",
        ui: { mec: "ecuacion", quien: "cto", animo: "preocupado", dice: "Cada proyecto es un sí o un no. Formula el modelo binario con los datos del expediente." },
        descripcion: "Variables, función objetivo y restricciones.",
        filas: [
          ["Dominio de las variables:", sel("dom", [
            { v: "cont", t: "xᵢ ≥ 0 continuas" }, { v: "ent", t: "xᵢ enteras ≥ 0" }, { v: "bin", t: "xᵢ ∈ {0, 1}" }])],
          ["Max Z =", n("c1"), "x₁ +", n("c2"), "x₂ +", n("c3"), "x₃"],
          [n("a1"), "x₁ +", n("a2"), "x₂ +", n("a3"), "x₃ ≤", n("b1"), "(presupuesto)"],
          [n("h1"), "x₁ +", n("h2"), "x₂ +", n("h3"), "x₃ ≤", n("b2"), "(horas)"]
        ],
        check: exact({ dom: "bin", c1: 75, c2: 90, c3: 52, a1: 40, a2: 55, a3: 30, b1: 85, h1: 20, h2: 28, h3: 16, b2: 44 })
      },
      {
        id: "B",
        titulo: "Combinaciones",
        ui: { mec: "sellos", quien: "cfo", animo: "serio", dice: "Revisa todas las combinaciones y sella las que se salen del presupuesto o de las horas." },
        descripcion: "Determina todas las combinaciones e identifica las infactibles.",
        filas: [
          ["Número de combinaciones posibles:", n("tot")],
          ["Marca las combinaciones que NO son factibles:"],
          [multi("inf", ["P1", "P2", "P3", "P1+P2", "P1+P3", "P2+P3", "P1+P2+P3"])]
        ],
        check: exact({ tot: 8, inf: ["P1+P2", "P1+P2+P3"] })
      },
      {
        id: "C",
        titulo: "Evalúa una combinación",
        ui: { mec: "expediente", quien: "cfo", animo: "serio", grupo: "p", destacar: ["P1", "P3"], dice: "Evaluemos una alternativa concreta: si ejecutamos P1 + P3, ¿cuánto cuesta, cuántas horas exige y cuánto deja?" },
        descripcion: "Calcula los recursos y el beneficio de ejecutar P1 + P3.",
        filas: [["Costo =", n("c"), "M   Horas =", n("h"), "h   Beneficio =", n("b"), "M"]],
        check: exact({ c: 70, h: 36, b: 127 })
      },
      {
        id: "D",
        titulo: "Solución óptima",
        ui: { mec: "tablero", quien: "ceo", animo: "urgente", grupo: "p", vars: ["x1", "x2", "x3"], z: "z", tipo: "binario", dice: "Llegó el momento. ¿Qué proyectos implementamos para salvar la empresa?" },
        descripcion: "Ingresa la combinación óptima y el beneficio máximo.",
        filas: [["x₁ =", n("x1"), "x₂ =", n("x2"), "x₃ =", n("x3")], ["Z =", n("z"), "millones COP"]],
        check: solucion({
          vars: ["x1", "x2", "x3"], c: [75, 90, 52], zOpt: 142, dominio: binario,
          cons: [{ a: [40, 55, 30], b: 85, msg: "Excede el presupuesto" }, { a: [20, 28, 16], b: 44, msg: "Excede las horas técnicas" }]
        })
      },
      {
        id: "E",
        titulo: "Interpretación — clave final",
        ui: { mec: "dialogo", quien: "ceo", animo: "serio", dice: "La junta necesita entender tu decisión antes de firmar el plan." },
        descripcion: "Interpreta la solución para la gerencia.",
        filas: [
          ["¿Qué restricciones quedan activas (se usan al 100 %) en el óptimo?"],
          [sel("act", [{ v: "p", t: "Solo el presupuesto" }, { v: "h", t: "Solo las horas" }, { v: "ambas", t: "Ambas" }, { v: "ninguna", t: "Ninguna" }])],
          ["¿Por qué elegir el proyecto de mayor beneficio individual (P2) no basta para decidir?"],
          [sel("por", [
            { v: "a", t: "Porque P2 por sí solo es infactible" },
            { v: "b", t: "Porque P2 + P1 excede los recursos y P2 + P3 los aprovecha mejor" },
            { v: "c", t: "Porque P3 tiene más beneficio que P2" },
            { v: "d", t: "Porque las variables binarias no permiten elegir P2" }])]
        ],
        check: exact({ act: "ambas", por: "b" })
      }
    ],
    pistas: [
      { costo: 10, texto: "Con 3 variables binarias hay 2³ = 8 combinaciones; suma costo y horas de cada una." },
      { costo: 15, texto: "Solo las combinaciones que incluyen P1 y P2 juntos violan las restricciones." },
      { costo: 25, texto: "El óptimo usa exactamente los 85 M y las 44 h disponibles." }
    ],
    solucion: `
      <p>Max Z = 75x₁ + 90x₂ + 52x₃ · s.a. 40x₁ + 55x₂ + 30x₃ ≤ 85 · 20x₁ + 28x₂ + 16x₃ ≤ 44 · xᵢ ∈ {0,1}</p>
      <p>8 combinaciones; infactibles: P1+P2 (95 M, 48 h) y P1+P2+P3 (125 M, 64 h). P1+P3 = 70 M, 36 h, 127 M.</p>
      <p><b>Óptimo: x = (0, 1, 1), Z = 142 M</b> · usa exactamente 85 M y 44 h (ambas restricciones activas).</p>`
  }
};

const ORDER = Object.values(LOCKS).sort((a, b) => a.orden - b.orden).map(l => l.id);

// Lo que se envía al navegador: sin respuestas ni textos de pistas.
function publicLock(id) {
  const L = LOCKS[id];
  return {
    id: L.id, grupo: L.grupo, titulo: L.titulo, subtitulo: L.subtitulo, color: L.color,
    historia: L.historia, enunciado: L.enunciado, tablas: L.tablas, bonusMin: L.bonusMin,
    quien: L.quien, proyectos: L.proyectos, limites: L.limites, consecuencias: L.consecuencias,
    pistas: L.pistas.map(p => ({ costo: p.costo })),
    subs: L.subs.map(({ id, titulo, descripcion, filas, ui }) => ({ id, titulo, descripcion, filas, ui }))
  };
}

module.exports = { LOCKS, ORDER, publicLock };
