import { NextResponse } from "next/server";
import { exigeLlave, mal } from "@/lib/http";
import { avisoSolicitante, buscar, correoGerente } from "@/lib/compras";

// Bandeja simulada. tipo "gerente" (con botones) o "solicitante" (aviso final).
export async function POST(req: Request) {
  const noAuth = exigeLlave(req);
  if (noAuth) return noAuth;
  const b = await req.json().catch(() => null);
  const r = await buscar({ folio: Number(b?.folio) || undefined, token: b?.token });
  if (!r) return mal("Requisición no encontrada", 404);
  if (b?.tipo === "gerente") {
    if (!b.accionAprobar || !b.accionRechazar) return mal("Faltan accionAprobar / accionRechazar");
    await correoGerente(r, String(b.accionAprobar), String(b.accionRechazar));
  } else if (b?.tipo === "solicitante") {
    await avisoSolicitante(r.id);
  } else {
    return mal('tipo debe ser "gerente" o "solicitante"');
  }
  return NextResponse.json({ ok: true });
}
