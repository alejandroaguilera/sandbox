import { NextResponse } from "next/server";
import { exigeLlave, mal } from "@/lib/http";
import { registrar, SolicitudSchema } from "@/lib/compras";

export async function POST(req: Request) {
  const noAuth = exigeLlave(req);
  if (noAuth) return noAuth;
  const body = await req.json().catch(() => null);
  // n8n manda el payload del webhook tal cual; aceptamos { body: {...} } también.
  const p = SolicitudSchema.safeParse(body?.body ?? body);
  if (!p.success) return mal("Payload inválido");
  const r = await registrar(p.data);
  return NextResponse.json({ id: r.id, folio: r.folio, token: r.tokenAprobacion });
}
