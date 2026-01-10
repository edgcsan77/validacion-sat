import fs from "fs";
import path from "path";

const norm = (s) => (s || "").toString().trim().toUpperCase();

function pickD3FromPublishData(d) {
  // Ajusta aquí según cómo guardas keys en personas.json
  // Ejemplo de tus keys: "18687505554_GARC071203N60"
  // Entonces lo ideal es IDCIF + "_" + RFC
  const idcif = (d?.IDCIF_ETIQUETA || "").toString().trim();
  const rfc = (d?.RFC || "").toString().trim();
  if (idcif && rfc) return `${idcif}_${rfc}`;
  if (d?.D3) return d.D3;
  return "";
}

function personaFromPublishData(d) {
  // Mapear a tu estructura esperada por el validador
  return {
    rfc: d?.RFC || "",
    curp: d?.CURP || "",
    nombre: d?.NOMBRE || "",
    apellido_paterno: d?.PRIMER_APELLIDO || "",
    apellido_materno: d?.SEGUNDO_APELLIDO || "",
    fecha_nacimiento: d?.FECHA_NACIMIENTO || "",

    cp: d?.CP || "",
    colonia: d?.COLONIA || "",
    municipio: d?.LOCALIDAD || "",
    entidad: d?.ENTIDAD || "",

    regimen: d?.REGIMEN || "",
    fecha_alta: d?.FECHA_ALTA || "",
    fecha_inicio_operaciones: d?.FECHA_INICIO || "",
    fecha_ultimo_cambio: d?.FECHA_ULTIMO || "",
    situacion_contribuyente: d?.ESTATUS || "",

    // opcionales si no los tienes:
    tipo_vialidad: "",
    nombre_vialidad: "",
    numero_exterior: "",
    numero_interior: "",
    correo: "",
    al: "",
  };
}

export default async function handler(req, res) {
  try {
    // CORS básico
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.status(204).end();

    const query = req.query || {};
    const body = req.body || {};

    // 1) Intentar obtener D1/D2/D3 "clásico"
    let D1 = (query.D1 || body.D1 || "").toString();
    let D2 = (query.D2 || body.D2 || "").toString();
    let D3 = (query.D3 || body.D3 || "").toString();

    // 2) Si viene formato publish: body.data
    const hasData = !!body?.data && typeof body.data === "object";
    if ((!D1 || !D2 || !D3) && hasData) {
      D1 = "10";
      D2 = "1";
      D3 = pickD3FromPublishData(body.data) || "";
    }

    // ✅ Debug útil (lo verás en Vercel logs)
    console.log("validaciones got:", {
      method: req.method,
      query,
      bodyKeys: Object.keys(body || {}),
      hasData,
      dataKeys: hasData ? Object.keys(body.data) : [],
      extracted: { D1, D2, D3 },
    });

    // 3) Si NO hay D3 pero sí hay data, puedes responder directo (sin lookup)
    if ((!D1 || !D2 || !D3) && hasData) {
      const persona = personaFromPublishData(body.data);
      return res.status(200).json({ ok: true, source: "publish_data", persona });
    }

    // 4) Validación QR SAT
    if (D1 !== "10" || D2 !== "1" || !D3) {
      return res.status(400).json({
        ok: false,
        error: "QR inválido",
        got: { method: req.method, query, bodyKeys: Object.keys(body || {}) },
        extracted: { D1, D2, D3 },
      });
    }

    // 5) Cargar personas.json y buscar
    const filePath = path.join(process.cwd(), "public", "data", "personas.json");
    const raw = fs.readFileSync(filePath, "utf8");
    const db = JSON.parse(raw);

    const d3Norm = norm(D3);
    const key = Object.keys(db).find((k) => norm(k) === d3Norm);

    if (!key) {
      return res.status(404).json({
        ok: false,
        error: "No encontrado",
        d3: D3,
        d3Norm,
        totalKeys: Object.keys(db).length,
        sampleKeys: Object.keys(db).slice(0, 10),
        filePath,
      });
    }

    return res.status(200).json({ ok: true, key, persona: db[key] });
  } catch (e) {
    console.error("validaciones error:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
