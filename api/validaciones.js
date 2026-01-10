import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  const norm = (s) => (s || "").toString().trim().toUpperCase();
  const pick = (obj, p) => p.split(".").reduce((a, k) => (a && a[k] != null ? a[k] : undefined), obj);

  const body = req.body || {};
  const data = body.data || {};

  let D1 = (req.query && req.query.D1) || body.D1 || "";
  let D2 = (req.query && req.query.D2) || body.D2 || "";
  let D3 = (req.query && req.query.D3) || body.D3 || "";

  if (!D3) {
    const idcif = pick(body, "data.IDCIF_ETIQUETA") || pick(body, "data.IDCIF") || "";
    const rfc = pick(body, "data.RFC") || "";
    if (idcif && rfc) {
      D1 = D1 || "10";
      D2 = D2 || "1";
      D3 = `${idcif}_${rfc}`;
    }
  }

  const got = {
    method: req.method,
    query: req.query || {},
    bodyKeys: Object.keys(body || {}),
    dataKeys: Object.keys(data || {}),
    extracted: { D1, D2, D3 },
  };

  if (String(D1) !== "10" || String(D2) !== "1" || !D3) {
    return res.status(400).json({ ok: false, error: "QR inválido", got });
  }

  // ✅ Cargar personas.json desde el filesystem del serverless (SIEMPRE coincide con el deploy)
  let db;
  let filePath;
  try {
    filePath = path.join(process.cwd(), "public", "data", "personas.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    db = JSON.parse(raw);
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "No pude leer public/data/personas.json en el server",
      filePath,
      reason: String(e?.message || e),
      got,
    });
  }

  const D3N = norm(D3);
  const keys = Object.keys(db || {});
  const key = keys.find((k) => norm(k) === D3N);

  if (!key) {
    return res.status(404).json({
      ok: false,
      error: "No encontrado",
      d3: D3,
      d3Norm: D3N,
      totalKeys: keys.length,
      filePath,
      // debug útil:
      hasExactKey: !!db[D3],
      got,
    });
  }

  return res.status(200).json({ ok: true, key, persona: db[key] });
}
