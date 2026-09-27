import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigeAdmin } from "@/lib/admin";
import { mal } from "@/lib/http";

export async function POST(req: Request) {
  const noAuth = await exigeAdmin();
  if (noAuth) return noAuth;
  const b = await req.json().catch(() => null);
  if (b?.accion === "vaciar") {
    const r = await prisma.salaRespuesta.deleteMany();
    return NextResponse.json({ ok: true, borradas: r.count });
  }
  if (typeof b?.id === "string" && typeof b?.oculto === "boolean") {
    await prisma.salaRespuesta.update({ where: { id: b.id }, data: { oculto: b.oculto } });
    return NextResponse.json({ ok: true });
  }
  return mal("Acción inválida");
}
