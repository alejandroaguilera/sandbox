import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigeAdmin } from "@/lib/admin";
import { TAMANOS } from "@/lib/constantes";

export const dynamic = "force-dynamic";

const celda = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  // Evita inyección de fórmulas al abrir en Excel.
  const seguro = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n;]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
};

export async function GET() {
  const noAuth = await exigeAdmin();
  if (noAuth) return noAuth;
  const leads = await prisma.lead.findMany({ orderBy: { createdAt: "asc" } });
  const tam = Object.fromEntries(TAMANOS.map((t) => [t.id, t.nombre]));
  const enc = ["Fecha", "Nombre", "Empresa", "Correo", "WhatsApp", "Tamaño", "Giro", "Proceso que duele", "Quiere diagnóstico", "Consentimiento"];
  const filas = leads.map((l) =>
    [
      l.createdAt.toISOString().replace("T", " ").slice(0, 19),
      l.nombre, l.empresa, l.correo, l.whatsapp, tam[l.tamano], l.giro, l.procesoDoloroso,
      l.quiereDiagnostico ? "Sí" : "No", l.consentimiento ? "Sí" : "No",
    ].map(celda).join(","),
  );
  return new Response("﻿" + [enc.join(","), ...filas].join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-sandbox-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

export async function DELETE(req: Request) {
  const noAuth = await exigeAdmin();
  if (noAuth) return noAuth;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  await prisma.lead.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
