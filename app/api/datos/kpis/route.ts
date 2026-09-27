import { NextResponse } from "next/server";
import { agregados, PREGUNTAS } from "@/lib/datos";
import { estadoCache } from "@/lib/preguntar";

export const dynamic = "force-dynamic";

export async function GET() {
  const a = await agregados();
  return NextResponse.json({ kpis: a.kpis, preguntas: PREGUNTAS, cache: estadoCache() });
}
