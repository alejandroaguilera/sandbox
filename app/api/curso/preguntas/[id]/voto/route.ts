import { prisma } from "@/lib/db";
import { dispositivoDe, json, limiteCurso, sesionActiva } from "@/lib/curso/servidor";

// 👍 a una pregunta: uno por dispositivo.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const d = dispositivoDe(req);
  const { id } = await params;
  if (d.nuevo) return json({ error: "Recarga la página e intenta de nuevo." }, d, 400);
  if (!limiteCurso(req, "pvoto", d.id, 40, 60_000)) return json({ error: "Demasiados intentos" }, d, 429);
  const s = await sesionActiva();
  const p = s && (await prisma.cursoPregunta.findFirst({ where: { id, sesionId: s.id, oculta: false }, select: { id: true } }));
  if (!p) return json({ error: "La pregunta ya no existe" }, d, 404);
  try {
    await prisma.cursoPreguntaVoto.create({ data: { preguntaId: id, dispositivo: d.id } });
    await prisma.cursoPregunta.update({ where: { id }, data: { votos: { increment: 1 } } });
  } catch {
    // ya había votado: no pasa nada
  }
  return json({ ok: true }, d);
}
