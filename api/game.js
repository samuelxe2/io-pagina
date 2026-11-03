// Función serverless de Vercel: POST /api/game  { action, ...datos }
const { handle } = require("../lib/engine");

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return JSON.parse(raw || "{}");
}

module.exports = async (req, res) => {
  const send = (status, obj) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify(obj));
  };
  if (req.method !== "POST") return send(405, { error: "Usa POST." });
  try {
    const body = await readBody(req);
    send(200, await handle(body.action, body));
  } catch (e) {
    if (!e.status) console.error(e);
    send(e.status || 500, { error: e.status ? e.message : "Error interno del servidor." });
  }
};
