import { prisma } from "@/lib/db";
import { tieneGroserias } from "@/lib/groserias";
import { votacionDe } from "@/lib/curso/contenido";
import { dispositivoDe, json, limiteCurso, sesionActiva } from "@/lib/curso/servidor";

// Un voto por dispositivo (y por pregunta en el sondeo); se puede cambiar mientras la votación siga abierta.
export async function POST(req: Request) {
  const d = dispositivoDe(req);
  const b = await req.json().catch(() => null);
  const def = votacionDe(String(b?.clave ?? ""));
  if (!def) return json({ error: "Votación desconocida" }, d, 400);
  if (!limiteCurso(req, "votar", d.id, 40, 60_000)) return json({ error: "Demasiados intentos. Espera un momento." }, d, 429);
  const s = await sesionActiva();
  const v = s && (await prisma.cursoVotacion.findUnique({ where: { sesionId_clave: { sesionId: s.id, clave: def.id } } }));
  if (!v?.abierta) return json({ error: "Esta votación ya se cerró." }, d, 409);

  let pregunta = "";
  let valor = String(b?.valor ?? "").trim().replace(/\s+/g, " ");
  if (def.tipo === "sino") {
    pregunta = String(b?.pregunta ?? "");
    if (!def.preguntas?.some((p) => p.id === pregunta) || !["si", "no"].includes(valor)) return json({ error: "Respuesta inválida" }, d, 400);
  } else if (def.tipo === "unica") {
    if (!def.opciones?.includes(valor)) return json({ error: "Opción inválida" }, d, 400);
  } else {
    if (def.tipo === "palabra") valor = valor.split(" ")[0].replace(/[.,;:!¡¿?"“”]/g, "");
    valor = valor.slice(0, def.max ?? 120);
    if (!valor) return json({ error: "Escribe tu respuesta" }, d, 400);
  }
  const oculto = def.tipo === "palabra" || def.tipo === "texto" ? tieneGroserias(valor) : false;
  await prisma.cursoVoto.upsert({
    where: { votacionId_dispositivo_pregunta: { votacionId: v.id, dispositivo: d.id, pregunta } },
    create: { votacionId: v.id, dispositivo: d.id, pregunta, valor, oculto },
    update: { valor, oculto },
  });
  return json({ ok: true }, d);
}
