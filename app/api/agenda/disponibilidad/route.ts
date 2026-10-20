import { NextResponse } from "next/server";
import { disponibilidad } from "@/lib/agenda";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  return NextResponse.json({ horarios: await disponibilidad(q.get("fecha") ?? "", Number(q.get("servicio"))) });
}
