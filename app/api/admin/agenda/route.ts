import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigeAdmin } from "@/lib/admin";
import { mal } from "@/lib/http";

// Borra una reserva de la Demo 4. Las de ejemplo no se tocan (se regenerarían encima).
export async function DELETE(req: Request) {
  const noAuth = await exigeAdmin();
  if (noAuth) return noAuth;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return mal("Falta id");
  await prisma.reserva.deleteMany({ where: { id, origen: "vivo" } });
  return NextResponse.json({ ok: true });
}
