import { NextResponse } from "next/server";
import { limite, mal } from "@/lib/http";
import { preguntar } from "@/lib/preguntar";

export const maxDuration = 120;

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const q = String(b?.pregunta ?? "").trim().slice(0, 300);
  if (q.length < 3) return mal("Escribe una pregunta");
  const bloqueo = limite(req, "datos", 20, 10 * 60 * 1000);
  if (bloqueo) return bloqueo;
  return NextResponse.json(await preguntar(q));
}
