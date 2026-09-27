import { prisma } from "./db";

export type FlowMode = "direct" | "n8n";

export async function flowMode(): Promise<FlowMode> {
  const fila = await prisma.config.findUnique({ where: { clave: "FLOW_MODE" } }).catch(() => null);
  const v = fila?.valor ?? process.env.FLOW_MODE ?? "direct";
  return v === "n8n" ? "n8n" : "direct";
}

export async function setFlowMode(v: FlowMode) {
  await prisma.config.upsert({
    where: { clave: "FLOW_MODE" },
    create: { clave: "FLOW_MODE", valor: v },
    update: { valor: v },
  });
}

export function baseUrl() {
  return (process.env.PUBLIC_BASE_URL ?? "https://sandbox.mrhapps.mx").replace(/\/$/, "");
}
