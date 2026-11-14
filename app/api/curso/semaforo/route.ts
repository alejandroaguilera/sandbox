import { prisma } from "@/lib/db";
import { CONTENIDO } from "@/lib/curso/contenido";
import { dispositivoDe, json, limiteCurso, sesionActiva } from "@/lib/curso/servidor";

// Registra el acierto (o no) de una tarjeta para la gráfica del proyector. Cuenta la primera respuesta de cada dispositivo.
export async function POST(req: Request) {
  const d = dispositivoDe(req);
  const b = await req.json().catch(() => null);
  const caso = CONTENIDO.semaforo.find((c) => c.id === b?.tarjeta);
  if (!caso || !["verde", "amarillo", "rojo"].includes(b?.respuesta)) return json({ error: "Respuesta inválida" }, d, 400);
  const acierto = b.respuesta === caso.respuesta;
  const s = await sesionActiva();
  if (s && limiteCurso(req, "semaforo", d.id, 40, 60_000)) {
    await prisma.cursoSemaforo
      .create({ data: { sesionId: s.id, dispositivo: d.id, tarjeta: caso.id, acierto } })
      .catch(() => {});
  }
  return json({ acierto }, d);
}
