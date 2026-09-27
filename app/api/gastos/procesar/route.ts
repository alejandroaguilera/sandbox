import { NextResponse } from "next/server";
import sharp from "sharp";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { limite, mal } from "@/lib/http";
import { extraerTicket } from "@/lib/ai";

export const maxDuration = 60;

const serializa = (g: Awaited<ReturnType<typeof prisma.gasto.create>>) => ({
  ...g,
  subtotal: g.subtotal === null ? null : Number(g.subtotal),
  iva: g.iva === null ? null : Number(g.iva),
  total: g.total === null ? null : Number(g.total),
});

export async function POST(req: Request) {
  const bloqueo = limite(req, "gastos", 20, 10 * 60 * 1000);
  if (bloqueo) return bloqueo;
  const form = await req.formData().catch(() => null);
  const archivo = form?.get("imagen");
  if (!(archivo instanceof File)) return mal("Falta la imagen");
  if (archivo.size > 20 * 1024 * 1024) return mal("La imagen pesa más de 20 MB");

  // La imagen vive solo en memoria: se redimensiona, se manda a la IA y se descarta.
  let jpeg: Buffer;
  try {
    jpeg = await sharp(Buffer.from(await archivo.arrayBuffer()))
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
  } catch {
    const g = await prisma.gasto.create({ data: { categoria: "Otros", confianza: 0, revisar: true, origen: "error" } });
    return NextResponse.json({ gasto: serializa(g), error: "No es una imagen válida" });
  }

  try {
    const t = await extraerTicket(jpeg.toString("base64"), AbortSignal.timeout(30_000));
    const fecha = t.fecha && /^\d{4}-\d{2}-\d{2}$/.test(t.fecha) ? new Date(`${t.fecha}T12:00:00Z`) : null;
    const confianza = Math.max(0, Math.min(1, t.confianza));
    const cuadra = t.subtotal !== null && t.iva !== null && t.total !== null ? Math.abs(t.subtotal + t.iva - t.total) <= 1 : false;
    const revisar = confianza < 0.75 || t.total === null || !cuadra;
    const g = await prisma.gasto.create({
      data: {
        fecha: fecha && !isNaN(fecha.getTime()) ? fecha : null,
        proveedor: t.proveedor?.slice(0, 120) ?? null,
        rfc: t.rfc?.slice(0, 13).toUpperCase() ?? null,
        subtotal: t.subtotal,
        iva: t.iva,
        total: t.total,
        categoria: t.categoria,
        confianza,
        revisar,
        origen: "ia",
      },
    });
    return NextResponse.json({ gasto: serializa(g) });
  } catch (e) {
    const sinConexion =
      e instanceof Anthropic.APIConnectionError ||
      e instanceof Anthropic.AuthenticationError ||
      e instanceof Anthropic.RateLimitError ||
      e instanceof Anthropic.InternalServerError ||
      (e as Error).name === "TimeoutError" ||
      (e as Error).name === "AbortError" ||
      /ANTHROPIC_API_KEY/.test((e as Error).message);
    console.error("[gastos] IA falló:", (e as Error).message);
    const g = await prisma.gasto.create({ data: { categoria: "Otros", confianza: 0, revisar: true, origen: "error" } });
    return NextResponse.json({ gasto: serializa(g), error: "No se pudo leer", sinConexion });
  }
}
