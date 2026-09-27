import { createHmac } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { igualSeguro } from "./http";

export const COOKIE = "sbx_admin";
const DURACION_MS = 12 * 60 * 60 * 1000;

function secreto() {
  return createHmac("sha256", "sandbox-admin").update(process.env.ADMIN_PASSWORD ?? "").digest("hex");
}

function firma(exp: number) {
  return createHmac("sha256", secreto()).update(String(exp)).digest("hex");
}

export function crearToken() {
  const exp = Date.now() + DURACION_MS;
  return { valor: `${exp}.${firma(exp)}`, maxAge: DURACION_MS / 1000 };
}

export function tokenValido(valor?: string | null) {
  if (!valor || !process.env.ADMIN_PASSWORD) return false;
  const [expStr, f] = valor.split(".");
  const exp = Number(expStr);
  if (!exp || !f || exp < Date.now()) return false;
  return igualSeguro(f, firma(exp));
}

export function passwordCorrecta(p: string) {
  const esperada = process.env.ADMIN_PASSWORD ?? "";
  return !!esperada && igualSeguro(p, esperada);
}

export async function esAdmin() {
  const c = await cookies();
  return tokenValido(c.get(COOKIE)?.value);
}

export async function exigeAdmin() {
  if (await esAdmin()) return null;
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}
