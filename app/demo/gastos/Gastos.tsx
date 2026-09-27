"use client";
import { useEffect, useState } from "react";
import SubirTickets, { GastoFila } from "@/components/SubirTickets";
import { CATEGORIAS_GASTO } from "@/lib/constantes";

const $ = (n: number | null) => (n === null ? "—" : "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const fecha = (s: string | null) => (s ? new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) : "—");

export default function Gastos() {
  const [gastos, setGastos] = useState<GastoFila[]>([]);
  const [ejemplos, setEjemplos] = useState<GastoFila[]>([]);
  const [sinConexion, setSinConexion] = useState(false);
  const [leyendo, setLeyendo] = useState(0);

  async function cargar() {
    try {
      const r = await fetch("/api/gastos/lista", { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      setGastos(j.gastos);
      setEjemplos(j.ejemplos);
    } catch {}
  }
  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 2000);
    return () => clearInterval(t);
  }, []);

  const filas = sinConexion ? [...ejemplos, ...gastos] : gastos;
  const validas = filas.filter((g) => g.origen !== "error");
  const total = validas.reduce((s, g) => s + (g.total ?? 0), 0);
  const iva = validas.reduce((s, g) => s + (g.iva ?? 0), 0);
  const porCat = CATEGORIAS_GASTO.map((c) => ({ c, v: validas.filter((g) => g.categoria === c).reduce((s, g) => s + (g.total ?? 0), 0) })).filter((x) => x.v > 0);
  const maxCat = Math.max(1, ...porCat.map((x) => x.v));

  return (
    <>
      {sinConexion && (
        <div className="tarjeta" style={{ borderLeft: "6px solid var(--rojo)", marginBottom: 20, padding: "16px 24px", fontSize: 22 }}>
          <b className="rojo">Modo sin conexión</b> — mostramos 5 tickets de ejemplo ya procesados.{" "}
          <button className="boton secundario" style={{ fontSize: 16, padding: "8px 16px", marginLeft: 12 }} onClick={() => setSinConexion(false)}>Ocultar ejemplos</button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr)) minmax(0, 1.6fr)", gap: 20, marginBottom: 24 }}>
        <Kpi titulo="Tickets" valor={String(filas.length)} />
        <Kpi titulo="Total" valor={$(total)} />
        <Kpi titulo="IVA acreditable" valor={$(iva)} azul />
        <div className="tarjeta" style={{ padding: "18px 22px" }}>
          {porCat.length === 0 && <div className="gris" style={{ fontSize: 20 }}>Desglose por categoría</div>}
          {porCat.map((x) => (
            <div key={x.c} style={{ display: "grid", gridTemplateColumns: "190px 1fr 130px", alignItems: "center", gap: 12, fontSize: 17, marginBottom: 4 }}>
              <span className="gris" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.c}</span>
              <div style={{ height: 12, borderRadius: 6, background: "var(--azul)", width: `${(x.v / maxCat) * 100}%`, transition: "width .6s" }} />
              <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{$(x.v)}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "center" }}>
        <div style={{ width: 360 }}>
          <SubirTickets
            onInicio={(n) => setLeyendo((x) => x + n)}
            onResultado={(r) => {
              setLeyendo((x) => Math.max(0, x - 1));
              if (r.sinConexion) setSinConexion(true);
              cargar();
            }}
          />
        </div>
        <a className="boton secundario" href={`/api/gastos/exportar${sinConexion ? "?ejemplos=1" : ""}`}>Exportar a Excel</a>
      </div>

      <div className="tarjeta" style={{ padding: "8px 20px" }}>
        <table className="tabla" style={{ fontSize: 21 }}>
          <thead>
            <tr><th>Fecha</th><th>Proveedor</th><th>RFC</th><th>Categoría</th><th className="num">Subtotal</th><th className="num">IVA</th><th className="num">Total</th><th></th></tr>
          </thead>
          <tbody>
            {filas.map((g) =>
              g.origen === "error" ? (
                <tr key={g.id} className="entra">
                  <td colSpan={8}><span className="punto-rojo" /><span className="rojo">No se pudo leer — capturar a mano</span></td>
                </tr>
              ) : (
                <tr key={g.id} className="entra">
                  <td className="gris">{fecha(g.fecha)}</td>
                  <td style={{ fontWeight: 600 }}>{g.proveedor ?? "—"}</td>
                  <td className="gris" style={{ fontSize: 17 }}>{g.rfc ?? "—"}</td>
                  <td>{g.categoria}</td>
                  <td className="num">{$(g.subtotal)}</td>
                  <td className="num">{$(g.iva)}</td>
                  <td className="num" style={{ fontWeight: 700 }}>{$(g.total)}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{g.revisar && <><span className="punto-rojo" /><span className="rojo" style={{ fontSize: 18 }}>Revisar</span></>}</td>
                </tr>
              ),
            )}
            {Array.from({ length: leyendo }).map((_, k) => (
              <tr key={`l${k}`}><td colSpan={8} className="gris pulso">Leyendo ticket…</td></tr>
            ))}
            {filas.length === 0 && !leyendo && (
              <tr><td colSpan={8} className="gris" style={{ textAlign: "center", padding: "48px 0" }}>Sube la foto de un ticket para empezar</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Kpi({ titulo, valor, azul }: { titulo: string; valor: string; azul?: boolean }) {
  return (
    <div className="tarjeta" style={{ padding: "18px 22px" }}>
      <div className="gris" style={{ fontSize: 20 }}>{titulo}</div>
      <div style={{ fontSize: 44, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: azul ? "var(--azul)" : undefined }}>{valor}</div>
    </div>
  );
}
