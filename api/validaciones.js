import fs from "fs";
import path from "path";

const norm = (s) => (s || "").toString().trim().toUpperCase();

export default async function handler(req, res) {
  try {
    // Preflight
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      return res.status(200).end();
    }

    res.setHeader("Access-Control-Allow-Origin", "*");

    // 1) Intentar sacar D1/D2/D3 de query (GET)
    let D1 = req.query?.D1 || "";
    let D2 = req.query?.D2 || "";
    let D3 = req.query?.D3 || "";

    // 2) Si viene publish (POST), viene en body.data
    const body = req.body || {};
    const data = body.data || null;

    if ((!D1 || !D2 || !D3) && data) {
      const rfc = data.RFC || data.RFC_ETIQUETA || "";
      const idcif = data.IDCIF_ETIQUETA || "";
      D1 = "10";
      D2 = "1";
      D3 = (idcif && rfc) ? `${idcif}_${rfc}` : "";
    }

    // Debug útil para ver qué llegó
    const debug = {
      method: req.method,
      query: req.query || {},
      bodyKeys: Object.keys(body || {}),
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : [],
      extracted: { D1, D2, D3 },
    };

    if (D1 !== "10" || D2 !== "1" || !D3) {
      return res.status(400).json({ ok: false, error: "QR inválido", got: debug });
    }

    // Cargar personas.json desde /public/data
    const filePath = path.join(process.cwd(), "public", "data", "personas.json");
    const raw = fs.readFileSync(filePath, "utf8");
    const db = JSON.parse(raw);

    const d3Norm = norm(D3);
    let key = Object.keys(db).find((k) => norm(k) === d3Norm);

    // Fallback: buscar por RFC (por si alguna key no coincide exacta)
    if (!key) {
      const rfcPart = (D3.split("_")[1] || "").trim();
      if (rfcPart) {
        key = Object.keys(db).find((k) => norm(db[k]?.rfc) === norm(rfcPart));
      }
    }

    if (!key) {
      return res.status(404).json({
        ok: false,
        error: "No encontrado",
        d3: D3,
        d3Norm,
        totalKeys: Object.keys(db).length,
        sampleKeys: Object.keys(db).slice(0, 10),
        filePath,
        got: debug,
      });
    }

    return res.status(200).json({ ok: true, key, persona: db[key] });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "Server error", detail: String(e) });
  }
}
