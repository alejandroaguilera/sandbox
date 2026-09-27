"use client";
import { useEffect, useState } from "react";
import { DIMENSIONES, TAMANOS } from "@/lib/constantes";

interface Resumen {
  total: number;
  dimensiones: Record<string, number>;
  tamanos: Record<string, number>;
  procesos: { id: string; proceso: string; dimension: string }[];
}

const nombreDim = Object.fromEntries(DIMENSIONES.map((d) => [d.id, d.nombre]));

export default function EnVivo() {
  const [r, setR] = useState<Resumen | null>(null);
  const [i, setI] = useState(0);
  const [sinRed, setSinRed] = useState(false);

  useEffect(() => {
    let vivo = true;
    const cargar = async () => {
      try {
        const res = await fetch("/api/sala/resumen", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const j = await res.json();
        if (vivo) { setR(j); setSinRed(false); }
      } catch {
        if (vivo) setSinRed(true);
      }
    };
    cargar();
    const t = setInterval(cargar, 3000);
    return () => { vivo = false; clearInterval(t); };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setI((x) => x + 1), 6000);
    return () => clearInterval(t);
  }, []);

  const total = r?.total ?? 0;
  const max = Math.max(0, ...DIMENSIONES.map((d) => r?.dimensiones[d.id] ?? 0));
  const procesos = r?.procesos ?? [];
  const actual = procesos.length ? procesos[i % procesos.length] : null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(0, 1fr)", gap: 48, alignItems: "start" }}>
      <div>
        {DIMENSIONES.map((d) => {
          const n = r?.dimensiones[d.id] ?? 0;
          const pct = total ? Math.round((n / total) * 100) : 0;
          const lider = n > 0 && n === max;
          return (
            <div key={d.id} style={{ marginBottom: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <span style={{ fontSize: 28, fontWeight: 600, color: lider ? "var(--azul)" : "var(--texto)" }}>{d.nombre}</span>
                <span style={{ fontSize: 40, fontWeight: 700, color: lider ? "var(--azul)" : "var(--texto)", fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
              </div>
              <div style={{ height: 22, background: "var(--tarjeta)", borderRadius: 11, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: lider ? "var(--azul)" : "#48484a", borderRadius: 11, transition: "width .8s ease" }} />
              </div>
            </div>
          );
        })}
        <p className="gris" style={{ fontSize: 22, marginTop: 28 }}>
          Por tamaño:{" "}
          {TAMANOS.map((t, k) => (
            <span key={t.id}>
              {k > 0 && " · "}
              {t.nombre}: <b style={{ color: "var(--texto)" }}>{r?.tamanos[t.id] ?? 0}</b>
            </span>
          ))}
        </p>
      </div>

      <div>
        <div className="tarjeta" style={{ textAlign: "center", padding: "28px 24px", marginBottom: 24 }}>
          <div style={{ fontSize: 132, fontWeight: 700, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{total}</div>
          <div className="gris" style={{ fontSize: 26, marginTop: 8 }}>respuestas{sinRed && <span className="rojo"> · reconectando…</span>}</div>
        </div>
        <div className="tarjeta" style={{ minHeight: 300, display: "flex", flexDirection: "column", justifyContent: "center", padding: 36 }}>
          {actual ? (
            <div key={`${actual.id}-${i}`} className="entra">
              <div className="azul" style={{ fontSize: 22, fontWeight: 600, marginBottom: 14 }}>{nombreDim[actual.dimension]}</div>
              <div style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.15 }}>“{actual.proceso}”</div>
            </div>
          ) : (
            <div className="gris" style={{ fontSize: 30, textAlign: "center" }}>Escanea el código y cuéntanos…</div>
          )}
        </div>
      </div>
    </div>
  );
}
