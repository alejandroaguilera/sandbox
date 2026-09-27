import { NextResponse } from "next/server";
import { exigeAdmin } from "@/lib/admin";
import { setFlowMode } from "@/lib/config";
import { mal } from "@/lib/http";
import { calentar } from "@/lib/preguntar";

export async function POST(req: Request) {
  const noAuth = await exigeAdmin();
  if (noAuth) return noAuth;
  const b = await req.json().catch(() => null);
  if (b?.accion === "calentar") return NextResponse.json({ ok: true, ...(await calentar()) });
  if (b?.modo !== "direct" && b?.modo !== "n8n") return mal("modo debe ser direct o n8n");
  await setFlowMode(b.modo);
  return NextResponse.json({ ok: true, modo: b.modo });
}
