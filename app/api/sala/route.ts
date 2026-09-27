import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { limite, mal } from "@/lib/http";
import { tieneGroserias } from "@/lib/groserias";
import { DIMENSION_IDS, TAMANO_IDS } from "@/lib/constantes";

const Schema = z.object({
  dimension: z.enum(DIMENSION_IDS),
  tamano: z.enum(TAMANO_IDS),
  proceso: z.string().trim().min(2).max(160),
  sitio: z.string().optional(), // honeypot
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const p = Schema.safeParse(body);
  if (!p.success) return mal("Revisa los campos: elige una dimensión, un tamaño y escribe tu proceso.");
  // Honeypot: fingimos éxito sin guardar.
  if (p.data.sitio) return NextResponse.json({ ok: true });
  const bloqueo = limite(req, "sala", 3, 10 * 60 * 1000);
  if (bloqueo) return bloqueo;
  await prisma.salaRespuesta.create({
    data: {
      dimension: p.data.dimension as never,
      tamano: p.data.tamano as never,
      proceso: p.data.proceso,
      oculto: tieneGroserias(p.data.proceso),
    },
  });
  return NextResponse.json({ ok: true });
}
