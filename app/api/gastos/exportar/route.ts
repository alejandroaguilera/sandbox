import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const celda = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: Request) {
  const conEjemplos = new URL(req.url).searchParams.get("ejemplos") === "1";
  const filas = await prisma.gasto.findMany({
    where: conEjemplos ? {} : { origen: { not: "ejemplo" } },
    orderBy: { createdAt: "asc" },
  });
  const enc = ["Fecha", "Proveedor", "RFC", "Subtotal", "IVA", "Total", "Categoría", "Confianza", "Revisar"];
  const lineas = filas.map((g) =>
    [
      g.fecha?.toISOString().slice(0, 10),
      g.origen === "error" ? "No se pudo leer — capturar a mano" : g.proveedor,
      g.rfc,
      g.subtotal?.toFixed(2),
      g.iva?.toFixed(2),
      g.total?.toFixed(2),
      g.origen === "error" ? "" : g.categoria,
      g.confianza.toFixed(2),
      g.revisar ? "Sí" : "No",
    ]
      .map(celda)
      .join(","),
  );
  const csv = "﻿" + [enc.join(","), ...lineas].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gastos-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
