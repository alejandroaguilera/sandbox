import { prisma } from "@/lib/db";
import { CONTENIDO } from "@/lib/curso/contenido";
import { dispositivoDe, json, limiteCurso, sesionActiva } from "@/lib/curso/servidor";

// Una evaluación por dispositivo y sesión (si la reenvía, se actualiza).
export async function POST(req: Request) {
  const d = dispositivoDe(req);
  const b = await req.json().catch(() => null);
  const utilidad = Number(b?.utilidad);
  if (!Number.isInteger(utilidad) || utilidad < 1 || utilidad > 5) return json({ error: "Elige de 1 a 5" }, d, 400);
  const valioso = String(b?.valioso ?? "").trim().slice(0, 300) || null;
  const interes = CONTENIDO.evaluacion.intereses.includes(b?.interes) ? String(b.interes) : null;
  const s = await sesionActiva();
  if (!s) return json({ error: "La evaluación se recibe durante el curso." }, d, 409);
  if (!limiteCurso(req, "evaluacion", d.id, 6, 10 * 60_000)) return json({ error: "Demasiados intentos" }, d, 429);
  const datos = { utilidad, valioso, interes };
  await prisma.cursoEvaluacion.upsert({
    where: { sesionId_dispositivo: { sesionId: s.id, dispositivo: d.id } },
    create: { sesionId: s.id, dispositivo: d.id, ...datos },
    update: datos,
  });
  return json({ ok: true }, d);
}
