import { NextResponse } from "next/server";
import { COOKIE, crearToken, passwordCorrecta } from "@/lib/admin";
import { limite, mal } from "@/lib/http";

export async function POST(req: Request) {
  const bloqueo = limite(req, "admin-login", 10, 10 * 60 * 1000);
  if (bloqueo) return bloqueo;
  const b = await req.json().catch(() => null);
  if (!passwordCorrecta(String(b?.password ?? ""))) return mal("Contraseña incorrecta", 401);
  const t = crearToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, t.valor, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: t.maxAge });
  return res;
}
