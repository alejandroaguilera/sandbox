import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

export function ipDe(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "local";
}

// Rate limit en memoria (una sola réplica). Ventana deslizante por clave.
const cubetas = new Map<string, number[]>();
export function permitido(clave: string, max: number, ventanaMs: number): boolean {
  const ahora = Date.now();
  const lista = (cubetas.get(clave) ?? []).filter((t) => ahora - t < ventanaMs);
  if (lista.length >= max) {
    cubetas.set(clave, lista);
    return false;
  }
  lista.push(ahora);
  cubetas.set(clave, lista);
  if (cubetas.size > 20000) cubetas.clear();
  return true;
}

export function limite(req: Request, ruta: string, max: number, ventanaMs: number) {
  if (permitido(`${ruta}:${ipDe(req)}`, max, ventanaMs)) return null;
  return NextResponse.json(
    { error: "Demasiados envíos. Intenta de nuevo en unos minutos." },
    { status: 429 },
  );
}

export function igualSeguro(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Endpoints que llama n8n (o el flujo directo): exigen x-sandbox-key. */
export function exigeLlave(req: Request) {
  const esperada = process.env.SANDBOX_SHARED_KEY ?? "";
  const recibida = req.headers.get("x-sandbox-key") ?? "";
  if (!esperada || !igualSeguro(recibida, esperada)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return null;
}

export function mal(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}
