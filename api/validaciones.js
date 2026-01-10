// pages/api/validaciones.js  (Next.js pages router)
// Si estás en /api/validaciones.js directo (Vercel vanilla), también sirve igual.
import fs from "fs";
import path from "path";

function norm(s) {
  return String(s ?? "").trim().toUpperCase();
}

function pickFirst(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return undefined;
}

function parseFromPossibleUrl(str) {
  try {
    const s = String(str || "").trim();
    if (!s) return null;
    // si es solo querystring, le ponemos base
    const u = s.startsWith("http") ? new URL(s) : new URL(s, "https://x.local");
    const qs = u.searchParams;
    const D1 = qs.get("D1") || qs.get("d1");
    const D2 = qs.get("D2") || qs.get("d2");
    const D3 = qs.get("D3") || qs.get("d3");
    if (D1 || D2 || D3) return { D1, D2, D3 };
    return null;
  } catch {
    return null;
  }
}

function extractDParams(req) {
  const q = req.query || {};
  const b = req.body || {};
  const data = b.data || {};

  // 1) directo en query / body
  let D1 = pickFirst(q, ["D1", "d1"]) ?? pickFirst(b, ["D1", "d1"]);
  let D2 = pickFirst(q, ["D2", "d2"]) ?? pickFirst(b, ["D2", "d2"]);
  let D3 =
    pickFirst(q, ["D3", "d3"]) ??
    pickFirst(b, ["D3", "d3", "id", "code"]);

  // 2) dentro de data (publish)
  D1 = D1 ?? pickFirst(data, ["D1", "d1"]);
  D2 = D2 ?? pickFirst(data, ["D2", "d2"]);
  D3 = D3 ?? pickFirst(data, ["D3", "d3", "id", "code"]);

  // 3) si viene URL/texto del QR dentro de data.*
  const maybeUrlOrText =
    pickFirst(data, ["url", "qr", "text", "raw", "value"]) ??
    pickFirst(b, ["url", "qr", "text", "raw", "value"]);

  if ((!D1 || !D2 || !D3) && maybeUrlOrText) {
    const parsed = parseFromPossibleUrl(maybeUrlOrText);
    if (parsed) {
      D1 = D1 ?? parsed.D1;
      D2 = D2 ?? parsed.D2;
      D3 = D3 ?? parsed.D3;
    }
  }

  return {
    D1: String(D1 ?? ""),
    D2: String(D2 ?? ""),
    D3: String(D3 ?? ""),
    got: {
      method: req.method,
      query: q,
      bodyKeys: Object.keys(b || {}),
      dataKeys: Object.keys(data || {}),
      hasData: !!b.data,
    },
  };
}

function loadDB() {
  const filePath = path.join(process.cwd(), "public", "data", "personas.json");
  const raw = fs.readFileSync(filePath, "utf8");
  const db = JSON.parse(raw);
  return { db, filePath };
}

export default function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  const { D1, D2, D3, got } = extractDParams(req);

  // Validación QR SAT
  if (D1 !== "10" || D2 !== "1" || !D3) {
    return res.status(400).json({
      ok: false,
      error: "QR inválido",
      got: { ...got, extracted: { D1, D2, D3 } },
    });
  }

  let db, filePath;
  try {
    ({ db, filePath } = loadDB());
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "No pude leer personas.json",
      detail: String(e?.message || e),
    });
  }

  const d3Norm = norm(D3);
  const keys = Object.keys(db || {});
  const key = keys.find((k) => norm(k) === d3Norm);

  if (!key) {
    return res.status(404).json({
      ok: false,
      error: "No encontrado",
      d3: D3,
      d3Norm,
      totalKeys: keys.length,
      sampleKeys: keys.slice(0, 10),
      filePath,
    });
  }

  return res.status(200).json({
    ok: true,
    key,
    persona: db[key],
  });
}
