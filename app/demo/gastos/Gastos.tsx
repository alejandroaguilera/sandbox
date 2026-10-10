"use client";
import { useEffect, useState } from "react";
import SubirTickets, { GastoFila } from "@/components/SubirTickets";
import { CATEGORIAS_GASTO } from "@/lib/constantes";

const $ = (n: number | null) => (n === null ? "—" : "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const fecha = (s: string | null) => (s ? new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) : "—");

export default function Gastos({ admin = false }: { admin?: boolean }) {
  const [gastos, setGastos] = useState<GastoFila[]>([]);
  const [ejemplos, setEjemplos] = useState<GastoFila[]>([]);
  const [sinConexion, setSinConexion] = useState(false);
  const [leyendo, setLeyendo] = useState(0);
  const [borrando, setBorrando] = useState("");

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

  async function borrar(g: GastoFila) {
    if (!window.confirm(`¿Borrar el ticket${g.proveedor ? ` de ${g.proveedor}` : ""}?`)) return;
    setBorrando(g.id);
    try {
      const r = await fetch(`/api/admin/gastos?id=${encodeURIComponent(g.id)}`, { method: "DELETE" });
      if (r.status === 401) window.alert("Tu sesión de admin expiró. Entra de nuevo en /admin.");
      await cargar();
    } finally {
      setBorrando("");
    }
  }

  const filas = sinConexion ? [...ejemplos, ...gastos] : gastos;
  const validas = filas.filter((g) => g.origen !== "error");
  const total = validas.reduce((s, g) => s + (g.total ?? 0), 0);
  const iva = validas.reduce((s, g) => s + (g.iva ?? 0), 0);
  const porCat = CATEGORIAS_GASTO.map((c) => ({ c, v: validas.filter((g) => g.categoria === c).reduce((s, g) => s + (g.total ?? 0), 0) })).filter((x) => x.v > 0);
  const maxCat = Math.max(1, ...porCat.map((x) => x.v));

  return (
    <>
      {sinConexion && (
        <div className="tarjeta aviso-rojo">
          <b className="rojo">Modo sin conexión</b> — mostramos 5 tickets de ejemplo ya procesados.{" "}
          <button className="boton secundario boton-chico" onClick={() => setSinConexion(false)}>Ocultar ejemplos</button>
        </div>
      )}

      <div className="kpis kpis-gastos">
        <Kpi titulo="Tickets" valor={String(filas.length)} />
        <Kpi titulo="Total" valor={$(total)} />
        <Kpi titulo="IVA acreditable" valor={$(iva)} azul />
        <div className="tarjeta kpi">
          {porCat.length === 0 && <div className="kpi-titulo">Desglose por categoría</div>}
          {porCat.map((x) => (
            <div key={x.c} className="cat-fila">
              <span className="gris" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.c}</span>
              <div style={{ height: 12, borderRadius: 6, background: "var(--azul)", width: `${(x.v / maxCat) * 100}%`, transition: "width .6s" }} />
              <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{$(x.v)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="barra-herr">
        <div className="barra-subir">
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

      <div className="tarjeta tabla-caja">
        <table className="tabla tabla-grande">
          <thead>
            <tr><th>Fecha</th><th>Proveedor</th><th className="solo-ancho">RFC</th><th>Categoría</th><th className="num solo-ancho">Subtotal</th><th className="num">IVA</th><th className="num">Total</th><th></th>{admin && <th></th>}</tr>
          </thead>
          <tbody>
            {filas.map((g) =>
              g.origen === "error" ? (
                <tr key={g.id} className="entra">
                  <td colSpan={8}><span className="punto-rojo" /><span className="rojo">No se pudo leer — capturar a mano</span></td>
                  {admin && <td><BotonBorrar onClick={() => borrar(g)} ocupado={borrando === g.id} /></td>}
                </tr>
              ) : (
                <tr key={g.id} className="entra">
                  <td className="gris nowrap">{fecha(g.fecha)}</td>
                  <td style={{ fontWeight: 600 }}>{g.proveedor ?? "—"}</td>
                  <td className="gris solo-ancho" style={{ fontSize: "0.8em" }}>{g.rfc ?? "—"}</td>
                  <td>{g.categoria}</td>
                  <td className="num solo-ancho">{$(g.subtotal)}</td>
                  <td className="num">{$(g.iva)}</td>
                  <td className="num" style={{ fontWeight: 700 }}>{$(g.total)}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{g.revisar && <><span className="punto-rojo" /><span className="rojo" style={{ fontSize: "0.85em" }}>Revisar</span></>}</td>
                  {admin && <td>{g.origen !== "ejemplo" && <BotonBorrar onClick={() => borrar(g)} ocupado={borrando === g.id} />}</td>}
                </tr>
              ),
            )}
            {Array.from({ length: leyendo }).map((_, k) => (
              <tr key={`l${k}`}><td colSpan={admin ? 9 : 8} className="gris pulso">Leyendo ticket…</td></tr>
            ))}
            {filas.length === 0 && !leyendo && (
              <tr><td colSpan={admin ? 9 : 8} className="gris" style={{ textAlign: "center", padding: "48px 0" }}>Sube la foto de un ticket para empezar</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Kpi({ titulo, valor, azul }: { titulo: string; valor: string; azul?: boolean }) {
  return (
    <div className="tarjeta kpi">
      <div className="kpi-titulo">{titulo}</div>
      <div className="kpi-valor" style={{ color: azul ? "var(--azul)" : undefined }}>{valor}</div>
    </div>
  );
}

function BotonBorrar({ onClick, ocupado }: { onClick: () => void; ocupado: boolean }) {
  return (
    <button className="boton-borrar" title="Borrar ticket" aria-label="Borrar ticket" disabled={ocupado} onClick={onClick}>
      {ocupado ? "…" : "✕"}
    </button>
  );
}
