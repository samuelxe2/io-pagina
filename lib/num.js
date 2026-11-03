// Convierte "9/11", "2,125", "2.125" o 3 en número. Devuelve NaN si no es válido.
function parseNum(v) {
  if (typeof v === "number") return v;
  const s = String(v == null ? "" : v).trim().replace(/\s+/g, "").replace(",", ".");
  if (!s) return NaN;
  const f = s.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (f) return +f[2] === 0 ? NaN : +f[1] / +f[2];
  return /^-?(\d+\.?\d*|\.\d+)$/.test(s) ? +s : NaN;
}

const TOL = 0.011;
const near = (a, b, tol = TOL) => Number.isFinite(a) && Math.abs(a - b) <= tol;
const isInt = v => Number.isFinite(v) && Math.abs(v - Math.round(v)) < 1e-6;

module.exports = { parseNum, near, isInt, TOL };
