import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigeAdmin } from "@/lib/admin";
import { mal } from "@/lib/http";

// Borra un ticket de la Demo 2. Los de ejemplo (modo sin conexión) no se tocan.
export async function DELETE(req: Request) {
  const noAuth = await exigeAdmin();
  if (noAuth) return noAuth;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return mal("Falta id");
  await prisma.gasto.deleteMany({ where: { id, origen: { not: "ejemplo" } } });
  return NextResponse.json({ ok: true });
}
