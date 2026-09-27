import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const [porDim, porTam, ultimos] = await Promise.all([
    prisma.salaRespuesta.groupBy({ by: ["dimension"], _count: true }),
    prisma.salaRespuesta.groupBy({ by: ["tamano"], _count: true }),
    prisma.salaRespuesta.findMany({
      where: { oculto: false },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, proceso: true, dimension: true },
    }),
  ]);
  const dimensiones = Object.fromEntries(porDim.map((d) => [d.dimension, d._count]));
  const tamanos = Object.fromEntries(porTam.map((t) => [t.tamano, t._count]));
  const total = porDim.reduce((s, d) => s + d._count, 0);
  return NextResponse.json({ total, dimensiones, tamanos, procesos: ultimos }, { headers: { "Cache-Control": "no-store" } });
}
