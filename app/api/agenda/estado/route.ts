import { NextResponse } from "next/server";
import { estadoAgenda } from "@/lib/agenda";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return NextResponse.json(await estadoAgenda(new URL(req.url).searchParams.get("fecha")));
}
