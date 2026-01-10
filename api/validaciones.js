// /api/validaciones.js
import fs from "fs";
import path from "path";

function norm(s) {
  return String(s ?? "").trim().toUpperCase();
}

export default async function handler(req, res) {
  // CORS (por si lo llamas desde web)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  // 1) Tomar params por query o body (POST JSON)
  const q = req.query || {};
  const b = (req.body && typeof req.body === "object") ? req.body : {};

  const D1 = q.D1 ?? b.D1;
  const D2 = q.D2 ?? b.D2;
  const D3 = q.D3 ?? b.D3;

  // Para debug: ver qué llegó (sin romper)
  const got = { method: req.method, query: q, bodyKeys: Object.keys(b || {}) };

  // 2) Validación de QR
  if (String(D1) !== "10" || String(D2) !== "1" || !D3) {
    return res.status(400).json({ ok: false, error: "QR inválido", got });
  }

  // 3) Cargar personas.json
  const filePath = path.join(process.cwd(), "public", "data", "personas.json");
  let db = {};
  try {
    db = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (e) {
    return res.status(500).json({ ok: false, error: "No se pudo leer personas.json", filePath, detail: String(e) });
  }

  // 4) Buscar key por normalización
  const d3Norm = norm(D3);
  const key = Object.keys(db).find((k) => norm(k) === d3Norm);

  if (!key) {
    return res.status(404).json({
      ok: false,
      error: "No encontrado",
      d3: String(D3),
      d3Norm,
      totalKeys: Object.keys(db).length,
      sampleKeys: Object.keys(db).slice(0, 10),
      filePath
    });
  }

  return res.status(200).json({ ok: true, key, persona: db[key] });
}
