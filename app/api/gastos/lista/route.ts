import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const filas = await prisma.gasto.findMany({ orderBy: { createdAt: "asc" }, take: 200 });
  const s = filas.map((g) => ({
    id: g.id,
    fecha: g.fecha,
    proveedor: g.proveedor,
    rfc: g.rfc,
    subtotal: g.subtotal === null ? null : Number(g.subtotal),
    iva: g.iva === null ? null : Number(g.iva),
    total: g.total === null ? null : Number(g.total),
    categoria: g.categoria,
    confianza: g.confianza,
    revisar: g.revisar,
    origen: g.origen,
  }));
  return NextResponse.json(
    { gastos: s.filter((g) => g.origen !== "ejemplo"), ejemplos: s.filter((g) => g.origen === "ejemplo") },
    { headers: { "Cache-Control": "no-store" } },
  );
}
