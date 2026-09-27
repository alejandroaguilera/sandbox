import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "./db";

export const SolicitudSchema = z.object({
  solicitante: z.string().trim().min(1).max(80),
  area: z.string().trim().min(1).max(60),
  articulo: z.string().trim().min(1).max(120),
  cantidad: z.coerce.number().int().min(1).max(100000),
  montoEstimado: z.coerce.number().min(0).max(100_000_000),
  motivo: z.string().trim().max(300).optional().nullable(),
});
export type Solicitud = z.infer<typeof SolicitudSchema>;

export const GERENTE = "Gerente de compras";
const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));
const $ = (n: unknown) => "$" + Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export async function evento(requisicionId: string | null, paso: string, detalle?: string) {
  await prisma.eventoFlujo.create({ data: { requisicionId, paso, detalle } });
}

export async function registrar(s: Solicitud) {
  for (let intento = 0; intento < 5; intento++) {
    const ultimo = await prisma.requisicion.aggregate({ _max: { folio: true } });
    const folio = Math.max(1000, ultimo._max.folio ?? 1000) + 1;
    try {
      const req = await prisma.requisicion.create({
        data: { ...s, motivo: s.motivo || null, folio, tokenAprobacion: randomBytes(16).toString("hex") },
      });
      await evento(req.id, "Solicitud recibida", `${s.solicitante} · ${s.area}`);
      await evento(req.id, "Registrada en hoja de control", `Folio ${folio}`);
      return req;
    } catch (e) {
      if ((e as { code?: string }).code !== "P2002") throw e;
    }
  }
  throw new Error("No se pudo asignar folio");
}

export async function buscar(ref: { folio?: number; token?: string }) {
  if (ref.token) return prisma.requisicion.findUnique({ where: { tokenAprobacion: ref.token } });
  if (ref.folio) return prisma.requisicion.findUnique({ where: { folio: ref.folio } });
  return null;
}

type Req = NonNullable<Awaited<ReturnType<typeof buscar>>>;

export async function correoGerente(req: Req, accionAprobar: string, accionRechazar: string) {
  await prisma.correo.create({
    data: {
      para: GERENTE,
      asunto: `Requisición ${req.folio}: ${req.articulo} por ${$(req.montoEstimado)}`,
      cuerpo: `${req.solicitante} (${req.area}) solicita ${req.cantidad} × ${req.articulo}.\nMonto estimado: ${$(req.montoEstimado)}.${req.motivo ? `\nMotivo: ${req.motivo}` : ""}\n\n¿Autorizas la compra?`,
      accionAprobar,
      accionRechazar,
    },
  });
  if (/^https?:/.test(accionAprobar)) {
    await prisma.requisicion.update({ where: { id: req.id }, data: { resumeUrl: accionAprobar.split("?")[0] } });
  }
  await evento(req.id, "Correo al gerente", `Para: ${GERENTE}`);
  await evento(req.id, "Esperando aprobación");
}

export async function resolver(req: Req, decision: "aprobar" | "rechazar") {
  const estado = decision === "aprobar" ? "APROBADA" : "RECHAZADA";
  const act = await prisma.requisicion.updateMany({
    where: { id: req.id, estado: "PENDIENTE" },
    data: { estado, resueltaAt: new Date() },
  });
  if (act.count === 0) return false;
  await evento(req.id, decision === "aprobar" ? "Aprobada" : "Rechazada", `Por ${GERENTE}`);
  return true;
}

export async function avisoSolicitante(reqId: string) {
  const req = await prisma.requisicion.findUniqueOrThrow({ where: { id: reqId } });
  const ok = req.estado === "APROBADA";
  await prisma.correo.create({
    data: {
      para: req.solicitante,
      asunto: `Tu requisición ${req.folio} fue ${ok ? "aprobada ✅" : "rechazada"}`,
      cuerpo: ok
        ? `Hola ${req.solicitante}: el ${GERENTE} aprobó tu solicitud de ${req.cantidad} × ${req.articulo} (${$(req.montoEstimado)}). Compras ya la tiene en proceso.`
        : `Hola ${req.solicitante}: el ${GERENTE} rechazó tu solicitud de ${req.cantidad} × ${req.articulo}. Si es urgente, platícalo con él directamente.`,
    },
  });
  await evento(req.id, "Aviso al solicitante", `Para: ${req.solicitante}`);
}

// ---- Modo directo: la app corre el mismo flujo que n8n, con 1 s entre pasos para que se vea.
export async function flujoDirecto(s: Solicitud) {
  const req = await registrar(s);
  (async () => {
    try {
      await pausa(1000);
      await correoGerente(req, `direct:aprobar:${req.tokenAprobacion}`, `direct:rechazar:${req.tokenAprobacion}`);
    } catch (e) {
      console.error("[compras] flujo directo:", e);
    }
  })();
  return req;
}

/** El gerente pulsa Aprobar/Rechazar en la bandeja simulada. */
export async function ejecutarAccion(url: string) {
  const m = url.match(/^direct:(aprobar|rechazar):([a-f0-9]+)$/);
  if (m) {
    const req = await buscar({ token: m[2] });
    if (!req) throw new Error("Requisición no encontrada");
    if (!(await resolver(req, m[1] as "aprobar" | "rechazar"))) return;
    (async () => {
      await pausa(1000);
      await avisoSolicitante(req.id).catch((e) => console.error("[compras] aviso:", e));
    })();
    return;
  }
  const n8n = new URL(process.env.N8N_WEBHOOK_URL || "https://sandbox-n8n.mrhapps.mx/webhook/requisicion");
  if (!url.startsWith(`${n8n.origin}/`)) throw new Error("Acción inválida");
  // Modo n8n: reanuda la ejecución que está en el nodo Wait.
  const r = await fetch(url, { method: "GET", signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`n8n respondió ${r.status}`);
}
