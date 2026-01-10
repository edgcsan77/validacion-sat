const fs = require("fs");
const path = require("path");

function norm(s) {
  return (s || "").trim().toUpperCase();
}

module.exports = (req, res) => {
  // CORS básico (por si lo llamas desde web)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  const { D1, D2, D3 } = req.query || {};
  if (D1 !== "10" || D2 !== "1" || !D3) {
    return res.status(400).json({ ok: false, error: "QR inválido" });
  }

  // personas.json en /public/data/personas.json (o ajusta la ruta)
  const filePath = path.join(process.cwd(), "public", "data", "personas.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  const db = JSON.parse(raw) || {};

  const d3Norm = norm(D3);
  const key = Object.keys(db).find((k) => norm(k) === d3Norm);
  if (!key) return res.status(404).json({ ok: false, error: "No encontrado" });

  return res.status(200).json({ ok: true, key, persona: db[key] });
};
