import type { Metadata } from "next";
import { agregados, PREGUNTAS } from "@/lib/datos";
import { EMPRESA_FICTICIA } from "@/lib/constantes";
import Datos from "./Datos";

export const metadata: Metadata = { title: "Demo 3 · Pregúntale a tus datos" };
export const dynamic = "force-dynamic";

const $ = (n: number) => "$" + Math.round(n).toLocaleString("es-MX");

export default async function Page() {
  const { kpis } = await agregados();
  const tarjetas = [
    { t: "Ventas 12 meses", v: $(kpis.ventas12m) },
    { t: "Margen", v: `${kpis.margenPct}%` },
    { t: "Clientes activos", v: `${kpis.clientesActivos} de ${kpis.clientesTotales}` },
    { t: "Cuentas por cobrar vencidas", v: $(kpis.cxcVencidas), rojo: true },
  ];
  return (
    <div className="proyector">
      <div className="encabezado">
        <div>
          <h1>Pregúntale a tus datos</h1>
          <p className="sub">{EMPRESA_FICTICIA} · <span style={{ color: "var(--texto)" }}>empresa ficticia</span>, distribuidora de abarrotes e insumos en Nuevo Laredo</p>
        </div>
      </div>
      <div className="kpis">
        {tarjetas.map((k) => (
          <div key={k.t} className="tarjeta kpi">
            <div className="kpi-titulo">{k.t}</div>
            <div className="kpi-valor" style={{ color: k.rojo ? "var(--rojo)" : undefined }}>{k.v}</div>
          </div>
        ))}
      </div>
      <Datos preguntas={[...PREGUNTAS]} />
    </div>
  );
}
