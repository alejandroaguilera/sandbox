import { exigeAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const celda = (v: unknown) => {
  let s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@]/.test(s)) s = `'${s}`; // que Excel no lo tome por fórmula
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// CSV para el reporte al cliente: ?tipo=votos | preguntas | evaluacion (de la sesión ?s=codigo, o de la activa).
export async function GET(req: Request) {
  const noAuth = await exigeAdmin();
  if (noAuth) return noAuth;
  const q = new URL(req.url).searchParams;
  const codigo = q.get("s");
  const s = await prisma.cursoSesion.findFirst({ where: codigo ? { codigo } : { activa: true } });
  if (!s) return new Response("No hay sesión", { status: 404 });
  const tipo = q.get("tipo") ?? "";
  let filas: unknown[][];
  if (tipo === "votos") {
    const vots = await prisma.cursoVotacion.findMany({ where: { sesionId: s.id } });
    const clave = Object.fromEntries(vots.map((v) => [v.id, v.clave]));
    const votos = await prisma.cursoVoto.findMany({ where: { votacionId: { in: vots.map((v) => v.id) } }, orderBy: { createdAt: "asc" } });
    // El id del dispositivo no se exporta: solo un número consecutivo para poder cruzar respuestas.
    const n = new Map<string, number>();
    filas = [["votacion", "pregunta", "valor", "oculto", "participante", "fecha"], ...votos.map((v) => [clave[v.votacionId], v.pregunta, v.valor, v.oculto ? "sí" : "", n.get(v.dispositivo) ?? n.set(v.dispositivo, n.size + 1).get(v.dispositivo), v.createdAt])];
  } else if (tipo === "preguntas") {
    const ps = await prisma.cursoPregunta.findMany({ where: { sesionId: s.id }, orderBy: { votos: "desc" } });
    filas = [["pregunta", "votos", "respondida", "oculta", "fecha"], ...ps.map((p) => [p.texto, p.votos, p.respondida ? "sí" : "", p.oculta ? "sí" : "", p.createdAt])];
  } else if (tipo === "evaluacion") {
    const es = await prisma.cursoEvaluacion.findMany({ where: { sesionId: s.id }, orderBy: { createdAt: "asc" } });
    filas = [["utilidad", "lo_mas_valioso", "otra_sesion_sobre", "fecha"], ...es.map((e) => [e.utilidad, e.valioso, e.interes, e.createdAt])];
  } else return new Response("tipo debe ser votos, preguntas o evaluacion", { status: 400 });
  return new Response("﻿" + filas.map((f) => f.map(celda).join(",")).join("\r\n") + "\r\n", {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="curso-${s.codigo}-${tipo}.csv"`, "Cache-Control": "no-store" },
  });
}
