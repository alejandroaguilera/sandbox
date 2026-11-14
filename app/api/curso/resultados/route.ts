import { resultados } from "@/lib/curso/resultados";
import { json, sesionActiva } from "@/lib/curso/servidor";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const s = await sesionActiva();
  if (!s) return json({ error: "No hay sesión activa" }, undefined, 404);
  const r = await resultados(s.id, new URL(req.url).searchParams.get("v") ?? "");
  return r ? json(r) : json({ error: "No existe" }, undefined, 404);
}
