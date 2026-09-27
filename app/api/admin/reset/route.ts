import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigeAdmin } from "@/lib/admin";
import { mal } from "@/lib/http";

// Reinicia demos. Nunca toca leads ni la sala.
export async function POST(req: Request) {
  const noAuth = await exigeAdmin();
  if (noAuth) return noAuth;
  const b = await req.json().catch(() => null);
  if (b?.demo === "compras") {
    // Borrar requisiciones reinicia el folio: el siguiente es 1001.
    await prisma.$transaction([prisma.eventoFlujo.deleteMany(), prisma.correo.deleteMany(), prisma.requisicion.deleteMany()]);
    return NextResponse.json({ ok: true });
  }
  if (b?.demo === "gastos") {
    await prisma.gasto.deleteMany({ where: { origen: { not: "ejemplo" } } });
    return NextResponse.json({ ok: true });
  }
  return mal("demo debe ser compras o gastos");
}
