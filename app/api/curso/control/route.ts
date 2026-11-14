import { z } from "zod";
import { exigeAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { CLAVES_VOTACION, CONTENIDO } from "@/lib/curso/contenido";
import { costoUSD, gastoHoy, MAX_MENSAJES, MODELO_CURSO, TOPE_DIARIO_USD } from "@/lib/curso/ia";
import { conectados, invalidaSesion, json } from "@/lib/curso/servidor";

export const dynamic = "force-dynamic";

// Todo lo que ve el control: sesiones, estado de la activa, votaciones, uso de IA y preguntas.
export async function GET() {
  const noAuth = await exigeAdmin();
  if (noAuth) return noAuth;
  const sesiones = await prisma.cursoSesion.findMany({ orderBy: { fecha: "desc" }, take: 30 });
  const s = sesiones.find((x) => x.activa) ?? null;
  const gasto = await gastoHoy();
  const base = { sesiones, modelo: MODELO_CURSO, maxMensajes: MAX_MENSAJES, tope: TOPE_DIARIO_USD, gasto, iaLista: !!process.env.ANTHROPIC_API_KEY };
  if (!s) return json({ ...base, activa: null });
  const votaciones = await prisma.cursoVotacion.findMany({ where: { sesionId: s.id } });
  const [votos, uso, preguntas, semaforo, evaluaciones] = await Promise.all([
    prisma.cursoVoto.groupBy({ by: ["votacionId", "dispositivo"], where: { votacionId: { in: votaciones.map((v) => v.id) } } }),
    prisma.cursoUsoIA.aggregate({ where: { sesionId: s.id }, _sum: { mensajes: true, tokensEntrada: true, tokensSalida: true }, _count: true }),
    prisma.cursoPregunta.findMany({ where: { sesionId: s.id }, orderBy: [{ respondida: "asc" }, { votos: "desc" }, { createdAt: "asc" }], take: 100 }),
    prisma.cursoSemaforo.groupBy({ by: ["dispositivo"], where: { sesionId: s.id } }),
    prisma.cursoEvaluacion.aggregate({ where: { sesionId: s.id }, _count: true, _avg: { utilidad: true } }),
  ]);
  return json({
    ...base,
    activa: s,
    conectados: conectados(s.id),
    votaciones: CLAVES_VOTACION.map((clave) => {
      const v = votaciones.find((x) => x.clave === clave);
      return { clave, abierta: !!v?.abierta, participantes: v ? votos.filter((x) => x.votacionId === v.id).length : 0 };
    }),
    uso: {
      dispositivos: uso._count,
      mensajes: uso._sum.mensajes ?? 0,
      usd: costoUSD(uso._sum.tokensEntrada ?? 0, uso._sum.tokensSalida ?? 0),
    },
    preguntas,
    semaforo: semaforo.length,
    evaluacion: { n: evaluaciones._count, promedio: evaluaciones._avg.utilidad },
  });
}

const Sesion = z.object({
  codigo: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{2,48}$/, "El código lleva solo minúsculas, números y guiones"),
  cliente: z.string().trim().min(2).max(80),
  fecha: z.string().refine((f) => !isNaN(Date.parse(f)), "Fecha inválida"),
  wifi: z.string().trim().max(60).optional(),
});

export async function POST(req: Request) {
  const noAuth = await exigeAdmin();
  if (noAuth) return noAuth;
  const b = await req.json().catch(() => null);
  const accion = String(b?.accion ?? "");
  const mal = (m: string) => json({ error: m }, undefined, 400);
  const listo = () => {
    invalidaSesion();
    return json({ ok: true });
  };

  if (accion === "guardarSesion") {
    const p = Sesion.safeParse(b);
    if (!p.success) return mal(p.error.issues[0]?.message ?? "Revisa los datos");
    const datos = { cliente: p.data.cliente, fecha: new Date(p.data.fecha), wifi: p.data.wifi || null };
    await prisma.cursoSesion.upsert({ where: { codigo: p.data.codigo }, create: { codigo: p.data.codigo, ...datos }, update: datos });
    return listo();
  }
  if (accion === "activar") {
    const s = await prisma.cursoSesion.findUnique({ where: { id: String(b?.id ?? "") } });
    if (!s) return mal("Esa sesión no existe");
    await prisma.$transaction([
      prisma.cursoSesion.updateMany({ where: { activa: true }, data: { activa: false } }),
      prisma.cursoSesion.update({ where: { id: s.id }, data: { activa: true } }),
    ]);
    return listo();
  }
  if (accion === "desactivar") {
    await prisma.cursoSesion.updateMany({ where: { activa: true }, data: { activa: false } });
    return listo();
  }

  const s = await prisma.cursoSesion.findFirst({ where: { activa: true } });
  if (!s) return mal("Primero activa una sesión");
  const guarda = (data: Parameters<typeof prisma.cursoSesion.update>[0]["data"]) => prisma.cursoSesion.update({ where: { id: s.id }, data });

  if (accion === "momento") {
    const id = b?.id == null ? null : String(b.id);
    if (id && !CONTENIDO.momentos.some((m) => m.id === id)) return mal("Ese momento no existe");
    await guarda({ momentoId: id });
    return listo();
  }
  if (accion === "votacion") {
    const clave = String(b?.clave ?? "");
    if (!CLAVES_VOTACION.includes(clave)) return mal("Votación desconocida");
    const abierta = !!b?.abierta;
    await prisma.cursoVotacion.upsert({ where: { sesionId_clave: { sesionId: s.id, clave } }, create: { sesionId: s.id, clave, abierta }, update: { abierta } });
    if (abierta) await guarda({ proyector: `v:${clave}` }); // al abrirla se proyecta sola
    return listo();
  }
  if (accion === "reiniciarVotacion") {
    const v = await prisma.cursoVotacion.findUnique({ where: { sesionId_clave: { sesionId: s.id, clave: String(b?.clave ?? "") } } });
    if (v) await prisma.cursoVoto.deleteMany({ where: { votacionId: v.id } });
    return listo();
  }
  if (accion === "proyector") {
    const valor = String(b?.valor ?? "");
    if (!["qr", "semaforo", "preguntas", ...CLAVES_VOTACION.map((c) => `v:${c}`)].includes(valor)) return mal("Vista desconocida");
    await guarda({ proyector: valor });
    return listo();
  }
  if (accion === "ia") {
    await guarda({ ...(typeof b?.iaPausada === "boolean" && { iaPausada: b.iaPausada }), ...(typeof b?.sinIA === "boolean" && { sinIA: b.sinIA }) });
    return listo();
  }
  if (accion === "pregunta") {
    await prisma.cursoPregunta.updateMany({
      where: { id: String(b?.id ?? ""), sesionId: s.id },
      data: { ...(typeof b?.oculta === "boolean" && { oculta: b.oculta }), ...(typeof b?.respondida === "boolean" && { respondida: b.respondida }) },
    });
    return listo();
  }
  if (accion === "reiniciar") {
    // Deja la sesión como nueva: sin votos, preguntas, semáforo, evaluaciones ni uso de IA; el curso vuelve a "no ha empezado".
    const vots = await prisma.cursoVotacion.findMany({ where: { sesionId: s.id }, select: { id: true } });
    const pregs = await prisma.cursoPregunta.findMany({ where: { sesionId: s.id }, select: { id: true } });
    await prisma.$transaction([
      prisma.cursoVoto.deleteMany({ where: { votacionId: { in: vots.map((v) => v.id) } } }),
      prisma.cursoVotacion.deleteMany({ where: { sesionId: s.id } }),
      prisma.cursoPreguntaVoto.deleteMany({ where: { preguntaId: { in: pregs.map((p) => p.id) } } }),
      prisma.cursoPregunta.deleteMany({ where: { sesionId: s.id } }),
      prisma.cursoSemaforo.deleteMany({ where: { sesionId: s.id } }),
      prisma.cursoUsoIA.deleteMany({ where: { sesionId: s.id } }),
      prisma.cursoEvaluacion.deleteMany({ where: { sesionId: s.id } }),
      prisma.cursoSesion.update({ where: { id: s.id }, data: { momentoId: null, proyector: "qr", iaPausada: false, sinIA: false, epoca: { increment: 1 } } }),
    ]);
    return listo();
  }
  return mal("Acción desconocida");
}
