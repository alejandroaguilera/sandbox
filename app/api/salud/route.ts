import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { flowMode } from "@/lib/config";
import { estadoCache } from "@/lib/preguntar";
import { MODELO } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET() {
  let db = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch {}
  return NextResponse.json({
    ok: db,
    db,
    ia: !!process.env.ANTHROPIC_API_KEY,
    modelo: MODELO,
    modo: await flowMode().catch(() => "direct"),
    cacheDatos: estadoCache(),
  });
}
