import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { flowMode } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const [requisiciones, correos, modo] = await Promise.all([
    prisma.requisicion.findMany({
      orderBy: { folio: "desc" },
      take: 12,
      select: { id: true, folio: true, createdAt: true, solicitante: true, area: true, articulo: true, cantidad: true, montoEstimado: true, estado: true },
    }),
    prisma.correo.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    flowMode(),
  ]);
  const actual = requisiciones[0];
  const eventos = actual
    ? await prisma.eventoFlujo.findMany({ where: { requisicionId: actual.id }, orderBy: { createdAt: "asc" } })
    : [];
  return NextResponse.json(
    {
      modo,
      requisiciones: requisiciones.map((r) => ({ ...r, montoEstimado: Number(r.montoEstimado) })),
      correos: correos.map((c) => ({
        id: c.id,
        para: c.para,
        asunto: c.asunto,
        cuerpo: c.cuerpo,
        conBotones: !!c.accionAprobar,
        leido: c.leido,
        createdAt: c.createdAt,
      })),
      actual: actual ? { folio: actual.folio, estado: actual.estado } : null,
      eventos: eventos.map((e) => ({ paso: e.paso, detalle: e.detalle, createdAt: e.createdAt })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
