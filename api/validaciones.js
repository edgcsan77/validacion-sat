const fs = require("fs");
const path = require("path");

function norm(s) {
  return (s || "").trim().toUpperCase();
}

function loadDb() {
  // AJUSTA si tu archivo está en otro lado:
  // - si está en /data/personas.json (raíz), usa: path.join(process.cwd(), "data", "personas.json")
  // - si está en /public/data/personas.json, usa esto:
  const filePath = path.join(process.cwd(), "public", "data", "personas.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  const db = JSON.parse(raw);
  return { db: (db && typeof db === "object") ? db : {}, filePath };
}

module.exports = (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  const q = req.query || {};
  const D1 = q.D1;
  const D2 = q.D2;
  const D3 = q.D3;

  if (D1 !== "10" || D2 !== "1" || !D3) {
    return res.status(400).json({ ok: false, error: "QR inválido", got: { D1, D2, D3 } });
  }

  let loaded;
  try {
    loaded = loadDb();
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "No pude leer personas.json",
      detail: String(e),
      hint: "Revisa la ruta: public/data/personas.json o data/personas.json",
    });
  }

  const db = loaded.db;
  const keys = Object.keys(db);
  const d3Norm = norm(D3);

  const key = keys.find((k) => norm(k) === d3Norm);

  if (!key) {
    // 👇 esto te ayuda a ver qué sí existe
    return res.status(404).json({
      ok: false,
      error: "No encontrado",
      d3: D3,
      d3Norm,
      totalKeys: keys.length,
      sampleKeys: keys.slice(0, 10),
      filePath: loaded.filePath,
    });
  }

  return res.status(200).json({ ok: true, key, persona: db[key] });
};
