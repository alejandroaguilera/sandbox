import { NextResponse } from "next/server";
import { exigeLlave, mal } from "@/lib/http";
import { buscar, resolver } from "@/lib/compras";

export async function POST(req: Request) {
  const noAuth = exigeLlave(req);
  if (noAuth) return noAuth;
  const b = await req.json().catch(() => null);
  const decision = String(b?.decision ?? "").toLowerCase();
  if (decision !== "aprobar" && decision !== "rechazar") return mal("decision debe ser aprobar o rechazar");
  const r = await buscar({ folio: Number(b?.folio) || undefined, token: b?.token });
  if (!r) return mal("Requisición no encontrada", 404);
  await resolver(r, decision);
  return NextResponse.json({ ok: true, folio: r.folio, estado: decision === "aprobar" ? "APROBADA" : "RECHAZADA" });
}
