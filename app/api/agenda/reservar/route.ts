import { NextResponse } from "next/server";
import { limite, mal } from "@/lib/http";
import { ErrorAgenda, ReservaSchema, reservar } from "@/lib/agenda";
import { etiquetaDia, hhmm, servicioDe } from "@/lib/agenda-catalogo";

export async function POST(req: Request) {
  const p = ReservaSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return mal("Elige servicio, día, horario y cliente.");
  const bloqueo = limite(req, "agenda", 8, 10 * 60 * 1000);
  if (bloqueo) return bloqueo;
  try {
    const r = await reservar(p.data);
    return NextResponse.json({
      ok: true,
      reserva: { id: r.id, folio: r.folio, fecha: r.fecha, dia: etiquetaDia(r.fecha, true), inicio: hhmm(r.inicioMin), fin: hhmm(r.finMin), bahia: r.bahia, servicio: servicioDe(r.servicioId)?.nombre, cliente: r.clienteNombre },
    });
  } catch (e) {
    if (e instanceof ErrorAgenda) return mal(e.message, e.status);
    throw e;
  }
}
