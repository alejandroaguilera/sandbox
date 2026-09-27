"use client";
import { Bar, BarChart, LabelList, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { Respuesta } from "@/lib/datos";

const AZUL = "#2997FF";
const GRIS = "#86868B";

function formateador(formato: string) {
  return (v: number) => {
    if (formato === "moneda") {
      const a = Math.abs(v);
      if (a >= 1_000_000) return `$${(v / 1_000_000).toLocaleString("es-MX", { maximumFractionDigits: 2 })} M`;
      if (a >= 10_000) return `$${Math.round(v / 1000).toLocaleString("es-MX")} mil`;
      return `$${Math.round(v).toLocaleString("es-MX")}`;
    }
    if (formato === "porcentaje") return `${v.toLocaleString("es-MX", { maximumFractionDigits: 1 })}%`;
    return v.toLocaleString("es-MX", { maximumFractionDigits: 1 });
  };
}

export default function Grafica({ g }: { g: Respuesta["grafica"] }) {
  const n = Math.min(g.etiquetas.length, g.valores.length, g.tipo === "barras" ? 10 : 36);
  const data = Array.from({ length: n }, (_, i) => ({ k: g.etiquetas[i], v: g.valores[i] }));
  const fmt = formateador(g.formato);

  if (g.tipo === "linea") {
    return (
      <ResponsiveContainer width="100%" height={420}>
        <LineChart data={data} margin={{ top: 30, right: 30, left: 10, bottom: 10 }}>
          <XAxis dataKey="k" stroke={GRIS} tick={{ fill: GRIS, fontSize: 18 }} tickLine={false} axisLine={{ stroke: "#3a3a3c" }} />
          <YAxis stroke={GRIS} tick={{ fill: GRIS, fontSize: 18 }} tickFormatter={fmt} tickLine={false} axisLine={false} width={120} />
          <Line type="monotone" dataKey="v" stroke={AZUL} strokeWidth={4} dot={{ r: 5, fill: AZUL }} isAnimationActive />
        </LineChart>
      </ResponsiveContainer>
    );
  }
  const alto = Math.max(260, n * 52 + 20);
  return (
    <ResponsiveContainer width="100%" height={alto}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 130, left: 0, bottom: 4 }} barCategoryGap={10}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="k" width={300} stroke={GRIS} tick={{ fill: "#F5F5F7", fontSize: 19 }} tickLine={false} axisLine={false} interval={0} />
        <Bar dataKey="v" fill={AZUL} radius={[0, 8, 8, 0]} isAnimationActive>
          <LabelList dataKey="v" position="right" formatter={(v: unknown) => fmt(Number(v))} style={{ fill: "#F5F5F7", fontSize: 19, fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
