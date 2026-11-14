import { prisma } from "@/lib/db";
import { CONTENIDO, votacionDe } from "./contenido";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Resultados agregados (sin datos de ningún dispositivo) de una votación, del semáforo o de las preguntas. */
export async function resultados(sesionId: string, v: string) {
  if (v === "semaforo") {
    const filas = await prisma.cursoSemaforo.groupBy({ by: ["tarjeta", "acierto"], where: { sesionId }, _count: true });
    const tarjetas = CONTENIDO.semaforo.map((c) => {
      const ok = filas.find((f) => f.tarjeta === c.id && f.acierto)?._count ?? 0;
      const mal = filas.find((f) => f.tarjeta === c.id && !f.acierto)?._count ?? 0;
      return { id: c.id, caso: c.caso, respuesta: c.respuesta, aciertos: ok, total: ok + mal };
    });
    const jugadores = (await prisma.cursoSemaforo.groupBy({ by: ["dispositivo"], where: { sesionId } })).length;
    return { tipo: "semaforo", tarjetas, jugadores };
  }
  if (v === "preguntas") {
    const top = await prisma.cursoPregunta.findMany({
      where: { sesionId, oculta: false, respondida: false }, orderBy: [{ votos: "desc" }, { createdAt: "asc" }], take: 5, select: { id: true, texto: true, votos: true },
    });
    return { tipo: "preguntas", top, total: await prisma.cursoPregunta.count({ where: { sesionId, oculta: false } }) };
  }
  const def = votacionDe(v);
  if (!def) return null;
  const vot = await prisma.cursoVotacion.findUnique({ where: { sesionId_clave: { sesionId, clave: def.id } } });
  const base = { tipo: def.tipo, clave: def.id, abierta: !!vot?.abierta };
  if (!vot) return { ...base, participantes: 0, filas: [], textos: [] };
  const participantes = (await prisma.cursoVoto.groupBy({ by: ["dispositivo"], where: { votacionId: vot.id } })).length;
  if (def.tipo === "sino") {
    const g = await prisma.cursoVoto.groupBy({ by: ["pregunta", "valor"], where: { votacionId: vot.id }, _count: true });
    const filas = (def.preguntas ?? []).map((p) => {
      const si = g.find((x) => x.pregunta === p.id && x.valor === "si")?._count ?? 0;
      const no = g.find((x) => x.pregunta === p.id && x.valor === "no")?._count ?? 0;
      return { id: p.id, etiqueta: p.texto, n: si, total: si + no, color: p.color };
    });
    return { ...base, participantes, filas };
  }
  if (def.tipo === "unica") {
    const g = await prisma.cursoVoto.groupBy({ by: ["valor"], where: { votacionId: vot.id }, _count: true });
    const filas = (def.opciones ?? []).map((o) => ({ id: o, etiqueta: o, n: g.find((x) => x.valor === o)?._count ?? 0, total: participantes }));
    return { ...base, participantes, filas };
  }
  const votos = await prisma.cursoVoto.findMany({ where: { votacionId: vot.id, oculto: false }, orderBy: { createdAt: "desc" }, take: 400, select: { valor: true } });
  if (def.tipo === "palabra") {
    // Agrupa sin distinguir mayúsculas ni acentos; se muestra la forma más escrita.
    const grupos = new Map<string, { n: number; formas: Map<string, number> }>();
    for (const { valor } of votos) {
      const k = norm(valor);
      const gr = grupos.get(k) ?? { n: 0, formas: new Map() };
      gr.n++;
      const f = valor.toLowerCase();
      gr.formas.set(f, (gr.formas.get(f) ?? 0) + 1);
      grupos.set(k, gr);
    }
    const filas = [...grupos.values()]
      .map((gr) => ({ etiqueta: [...gr.formas.entries()].sort((a, b) => b[1] - a[1])[0][0], n: gr.n, total: votos.length }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 40);
    return { ...base, participantes, filas };
  }
  return { ...base, participantes, textos: votos.slice(0, 40).map((x) => x.valor) };
}
