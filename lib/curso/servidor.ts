import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import type { CursoSesion } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ipDe, permitido } from "@/lib/http";

export const COOKIE_DEV = "curso_dev";
const TREINTA_DIAS = 30 * 24 * 60 * 60;

// Estado compartido en globalThis: las rutas se empaquetan por separado (una sola réplica).
const g = globalThis as unknown as {
  __cursoSesion?: { t: number; s: CursoSesion | null; abiertas: string[] } | null;
  __cursoPresencia?: Map<string, Map<string, number>>;
};
const presencia = (g.__cursoPresencia ??= new Map());

/** Sesión activa + votaciones abiertas, con caché de 1 s: el polling de 40 celulares no toca la base cada vez. */
export async function estadoSesion() {
  const c = g.__cursoSesion;
  if (c && Date.now() - c.t < 1000) return c;
  const s = await prisma.cursoSesion.findFirst({ where: { activa: true }, orderBy: { fecha: "desc" } });
  const abiertas = s ? (await prisma.cursoVotacion.findMany({ where: { sesionId: s.id, abierta: true }, select: { clave: true } })).map((v) => v.clave) : [];
  return (g.__cursoSesion = { t: Date.now(), s, abiertas });
}
export function invalidaSesion() {
  g.__cursoSesion = null;
}
export async function sesionActiva() {
  return (await estadoSesion()).s;
}

export function marcaPresencia(sesionId: string, dispositivo: string) {
  let m = presencia.get(sesionId);
  if (!m) presencia.set(sesionId, (m = new Map()));
  m.set(dispositivo, Date.now());
}
export function conectados(sesionId: string) {
  const m = presencia.get(sesionId);
  if (!m) return 0;
  const corte = Date.now() - 60_000;
  for (const [d, t] of m) if (t < corte) m.delete(d);
  return m.size;
}

function leeCookie(req: Request, nombre: string) {
  const c = req.headers.get("cookie") ?? "";
  const m = c.match(new RegExp(`(?:^|;\\s*)${nombre}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : "";
}

/** Id anónimo del dispositivo (cookie httpOnly, 30 días). Si no existe, se crea y se manda en la respuesta. */
export function dispositivoDe(req: Request) {
  const actual = leeCookie(req, COOKIE_DEV);
  if (/^[a-f0-9]{24}$/.test(actual)) return { id: actual, nuevo: false };
  return { id: randomBytes(12).toString("hex"), nuevo: true };
}
export function conCookie<T extends Response>(res: T, d: { id: string; nuevo: boolean }): T {
  if (d.nuevo) {
    const seguro = process.env.NODE_ENV === "production" ? "; Secure" : "";
    res.headers.append("Set-Cookie", `${COOKIE_DEV}=${d.id}; Path=/; Max-Age=${TREINTA_DIAS}; HttpOnly; SameSite=Lax${seguro}`);
  }
  return res;
}
export function json(body: unknown, d?: { id: string; nuevo: boolean }, status = 200) {
  const res = NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  return d ? conCookie(res, d) : res;
}

/** Límite fino por dispositivo y tope amplio por IP (en el salón todos comparten la IP del Wi-Fi). */
export function limiteCurso(req: Request, ruta: string, dispositivo: string, max: number, ventanaMs: number) {
  return permitido(`curso:${ruta}:ip:${ipDe(req)}`, Math.max(300, max * 60), ventanaMs) && permitido(`curso:${ruta}:d:${dispositivo}`, max, ventanaMs);
}

export const hoyUTC = () => new Date().toISOString().slice(0, 10);
