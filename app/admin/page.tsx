import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { esAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { flowMode } from "@/lib/config";
import { estadoCache } from "@/lib/preguntar";
import { DIMENSIONES, TAMANOS } from "@/lib/constantes";
import Panel from "./Panel";

export const metadata: Metadata = { title: "Admin · Sandbox" };
export const dynamic = "force-dynamic";

export default async function Admin() {
  if (!(await esAdmin())) redirect("/admin/login");
  const [leads, sala, modo, nReq, nGastos] = await Promise.all([
    prisma.lead.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.salaRespuesta.findMany({ orderBy: { createdAt: "desc" }, take: 300 }),
    flowMode(),
    prisma.requisicion.count(),
    prisma.gasto.count({ where: { origen: { not: "ejemplo" } } }),
  ]);
  const tam = Object.fromEntries(TAMANOS.map((t) => [t.id, t.nombre]));
  const dim = Object.fromEntries(DIMENSIONES.map((d) => [d.id, d.nombre]));
  return (
    <Panel
      modo={modo}
      cache={estadoCache()}
      conteos={{ requisiciones: nReq, gastos: nGastos }}
      leads={leads.map((l) => ({
        id: l.id,
        fecha: l.createdAt.toISOString(),
        nombre: l.nombre,
        empresa: l.empresa,
        correo: l.correo,
        whatsapp: l.whatsapp,
        tamano: tam[l.tamano],
        giro: l.giro,
        proceso: l.procesoDoloroso,
        diagnostico: l.quiereDiagnostico,
      }))}
      sala={sala.map((s) => ({ id: s.id, fecha: s.createdAt.toISOString(), dimension: dim[s.dimension], tamano: tam[s.tamano], proceso: s.proceso, oculto: s.oculto }))}
    />
  );
}
