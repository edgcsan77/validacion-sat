export default async function handler(req, res) {
  const norm = (s) => (s || "").toString().trim().toUpperCase();

  const D3 =
    (req.query && req.query.D3) ||
    (req.body && req.body.D3) ||
    "";

  const D3N = norm(D3);

  if (!D3N) {
    return res.status(400).json({ ok: false, error: "QR inválido", got: { D3 } });
  }

  // 👇 Lee el MISMO archivo que tú probaste con curl
  const host = req.headers.host;
  const url = `https://${host}/data/personas.json`;

  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) {
    return res.status(500).json({ ok: false, error: "No pude cargar personas.json", status: r.status });
  }

  const db = await r.json();

  // búsqueda exacta (y fallback normalizado)
  let key = Object.keys(db).find((k) => norm(k) === D3N);
  if (!key) {
    return res.status(404).json({
      ok: false,
      error: "No encontrado",
      d3: D3,
      d3Norm: D3N,
      totalKeys: Object.keys(db).length,
      hint: "El registro no coincide con ninguna key del JSON servido en /data/personas.json"
    });
  }

  return res.status(200).json({ ok: true, key, persona: db[key] });
}
