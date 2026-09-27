import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { limite, mal } from "@/lib/http";
import { ejecutarAccion } from "@/lib/compras";

// El botón Aprobar / Rechazar de la bandeja simulada.
export async function POST(req: Request) {
  const bloqueo = limite(req, "accion", 30, 10 * 60 * 1000);
  if (bloqueo) return bloqueo;
  const b = await req.json().catch(() => null);
  const correo = await prisma.correo.findUnique({ where: { id: String(b?.correoId ?? "") } });
  if (!correo) return mal("Correo no encontrado", 404);
  const url = b?.decision === "aprobar" ? correo.accionAprobar : b?.decision === "rechazar" ? correo.accionRechazar : null;
  if (!url) return mal("Decisión inválida");
  try {
    await ejecutarAccion(url);
  } catch (e) {
    return mal(`No se pudo ejecutar: ${(e as Error).message}`, 502);
  }
  await prisma.correo.update({ where: { id: correo.id }, data: { leido: true } });
  return NextResponse.json({ ok: true });
}
