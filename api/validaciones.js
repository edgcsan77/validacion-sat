export default async function handler(req, res) {
  const norm = (s) => (s || "").toString().trim().toUpperCase();
  const pick = (obj, path) => {
    try {
      return path.split(".").reduce((a, k) => (a && a[k] != null ? a[k] : undefined), obj);
    } catch {
      return undefined;
    }
  };

  const body = req.body || {};
  const data = body.data || {};

  // 1) Intenta tomar D1/D2/D3 de query o body directo
  let D1 = (req.query && req.query.D1) || body.D1 || "";
  let D2 = (req.query && req.query.D2) || body.D2 || "";
  let D3 = (req.query && req.query.D3) || body.D3 || "";

  // 2) Si NO viene D3 (tu caso en "publish"), construirlo desde body.data
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
    extracted: { D1, D2, D3 }
  };

  // 3) Validar QR
  if (String(D1) !== "10" || String(D2) !== "1" || !D3) {
    return res.status(400).json({ ok: false, error: "QR inválido", got });
  }

  // 4) Cargar el MISMO JSON público del sitio
  const host = req.headers.host;
  const url = `https://${host}/data/personas.json`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) {
    return res.status(500).json({ ok: false, error: "No pude cargar personas.json", status: r.status, got });
  }
  const db = await r.json();

  // 5) Buscar por key normalizada
  const D3N = norm(D3);
  const key = Object.keys(db).find((k) => norm(k) === D3N);

  if (!key) {
    return res.status(404).json({
      ok: false,
      error: "No encontrado",
      d3: D3,
      d3Norm: D3N,
      totalKeys: Object.keys(db).length,
      got
    });
  }

  return res.status(200).json({ ok: true, key, persona: db[key] });
}
