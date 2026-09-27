import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { limite, mal } from "@/lib/http";
import { TAMANO_IDS } from "@/lib/constantes";

const opt = (max: number) =>
  z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));

const Schema = z.object({
  nombre: z.string().trim().min(2).max(100),
  empresa: z.string().trim().min(1).max(120),
  correo: z.string().trim().toLowerCase().email().max(160),
  whatsapp: opt(30),
  tamano: z.enum(TAMANO_IDS),
  giro: opt(100),
  procesoDoloroso: opt(300),
  quiereDiagnostico: z.boolean().default(false),
  consentimiento: z.literal(true),
  sitio: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const p = Schema.safeParse(body);
  if (!p.success) {
    const campo = p.error.issues[0]?.path[0];
    if (campo === "consentimiento") return mal("Necesitamos tu consentimiento para enviarte el material.");
    if (campo === "correo") return mal("Revisa tu correo electrónico.");
    return mal("Completa los campos obligatorios (*).");
  }
  if (p.data.sitio) return NextResponse.json({ ok: true });
  const bloqueo = limite(req, "material", 3, 10 * 60 * 1000);
  if (bloqueo) return bloqueo;
  const { sitio: _s, ...data } = p.data;
  await prisma.lead.create({ data: { ...data, tamano: data.tamano as never } });
  return NextResponse.json({ ok: true });
}
