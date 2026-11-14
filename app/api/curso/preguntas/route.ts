import { prisma } from "@/lib/db";
import { tieneGroserias } from "@/lib/groserias";
import { dispositivoDe, json, limiteCurso, sesionActiva } from "@/lib/curso/servidor";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const d = dispositivoDe(req);
  const s = await sesionActiva();
  if (!s) return json({ preguntas: [], votadas: [] }, d);
  const preguntas = await prisma.cursoPregunta.findMany({
    where: { sesionId: s.id, oculta: false }, orderBy: [{ respondida: "asc" }, { votos: "desc" }, { createdAt: "asc" }], take: 60,
    select: { id: true, texto: true, votos: true, respondida: true },
  });
  const votadas = await prisma.cursoPreguntaVoto.findMany({ where: { dispositivo: d.id, preguntaId: { in: preguntas.map((p) => p.id) } }, select: { preguntaId: true } });
  return json({ preguntas, votadas: votadas.map((v) => v.preguntaId) }, d);
}

export async function POST(req: Request) {
  const d = dispositivoDe(req);
  const b = await req.json().catch(() => null);
  const texto = String(b?.texto ?? "").trim().replace(/\s+/g, " ").slice(0, 200);
  if (texto.length < 4) return json({ error: "Escribe tu pregunta" }, d, 400);
  const s = await sesionActiva();
  if (!s) return json({ error: "Las preguntas se reciben durante el curso." }, d, 409);
  if (!limiteCurso(req, "preguntas", d.id, 5, 10 * 60_000)) return json({ error: "Ya mandaste varias preguntas. Espera unos minutos." }, d, 429);
  const p = await prisma.cursoPregunta.create({ data: { sesionId: s.id, texto, oculta: tieneGroserias(texto), votos: 1 } });
  await prisma.cursoPreguntaVoto.create({ data: { preguntaId: p.id, dispositivo: d.id } });
  return json({ ok: true }, d);
}
