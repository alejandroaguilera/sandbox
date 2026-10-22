import { after, NextResponse } from "next/server";
import { igualSeguro } from "@/lib/http";
import { procesar } from "@/lib/bot";

export const maxDuration = 120;

// Webhook del bot de Telegram. Se responde 200 de inmediato y el agente trabaja después,
// para que Telegram no reintente mientras la IA piensa.
export async function POST(req: Request) {
  const esperada = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
  const recibida = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!esperada || !igualSeguro(recibida, esperada)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const u = await req.json().catch(() => null);
  if (u?.update_id) after(() => procesar(u).catch((e) => console.error("[telegram]", (e as Error).message)));
  return NextResponse.json({ ok: true });
}
