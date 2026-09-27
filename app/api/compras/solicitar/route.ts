import { NextResponse } from "next/server";
import { limite, mal } from "@/lib/http";
import { flowMode } from "@/lib/config";
import { flujoDirecto, SolicitudSchema, evento } from "@/lib/compras";

export async function POST(req: Request) {
  const p = SolicitudSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return mal("Completa solicitante, área, artículo, cantidad y monto.");
  const bloqueo = limite(req, "compras", 10, 10 * 60 * 1000);
  if (bloqueo) return bloqueo;

  if ((await flowMode()) === "n8n") {
    const url = process.env.N8N_WEBHOOK_URL || "https://sandbox-n8n.mrhapps.mx/webhook/requisicion";
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-sandbox-key": process.env.SANDBOX_SHARED_KEY ?? "" },
        body: JSON.stringify(p.data),
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) throw new Error(`n8n respondió ${r.status}`);
      return NextResponse.json({ ok: true, modo: "n8n" });
    } catch (e) {
      // Red de seguridad: si n8n no responde, el flujo corre dentro de la app.
      console.error("[compras] n8n falló, uso modo directo:", (e as Error).message);
      const r = await flujoDirecto(p.data);
      await evento(r.id, "n8n no respondió — flujo directo");
      return NextResponse.json({ ok: true, modo: "direct", folio: r.folio });
    }
  }
  const r = await flujoDirecto(p.data);
  return NextResponse.json({ ok: true, modo: "direct", folio: r.folio });
}
