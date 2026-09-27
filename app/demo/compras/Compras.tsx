"use client";
import { useEffect, useState } from "react";
import FormSolicitud from "@/components/FormSolicitud";

interface Estado {
  modo: string;
  requisiciones: { id: string; folio: number; createdAt: string; solicitante: string; articulo: string; cantidad: number; montoEstimado: number; estado: string }[];
  correos: { id: string; para: string; asunto: string; cuerpo: string; conBotones: boolean; leido: boolean; createdAt: string }[];
  actual: { folio: number; estado: string } | null;
  eventos: { paso: string; detalle: string | null; createdAt: string }[];
}

const PASOS = ["Solicitud recibida", "Registrada en hoja de control", "Correo al gerente", "Esperando aprobación", "Aprobada", "Aviso al solicitante"];
const $ = (n: number) => "$" + n.toLocaleString("es-MX", { maximumFractionDigits: 0 });
const hora = (s: string) => new Date(s).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
const fechaCorta = (s: string) => new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
const ESTADO: Record<string, string> = { PENDIENTE: "Pendiente", APROBADA: "Aprobada", RECHAZADA: "Rechazada" };

export default function Compras() {
  const [e, setE] = useState<Estado | null>(null);
  const [ocupado, setOcupado] = useState("");
  const [aviso, setAviso] = useState("");

  async function cargar() {
    try {
      const r = await fetch("/api/compras/estado-actual", { cache: "no-store" });
      if (r.ok) setE(await r.json());
    } catch {}
  }
  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 1500);
    return () => clearInterval(t);
  }, []);

  async function decidir(correoId: string, decision: "aprobar" | "rechazar") {
    setOcupado(correoId + decision);
    setAviso("");
    try {
      const r = await fetch("/api/compras/accion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ correoId, decision }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setAviso(j.error || "No se pudo");
      await cargar();
    } finally {
      setOcupado("");
    }
  }

  // Línea de tiempo: pasos esperados + lo que realmente pasó (con hora al segundo).
  const eventos = e?.eventos ?? [];
  const rechazada = eventos.some((x) => x.paso === "Rechazada");
  const pasos = PASOS.map((p) => (p === "Aprobada" && rechazada ? "Rechazada" : p));
  const extra = eventos.filter((x) => !pasos.includes(x.paso));
  const pendientes = e?.requisiciones.filter((r) => r.estado === "PENDIENTE").map((r) => r.folio) ?? [];

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 0.8fr) minmax(0, 1.35fr) minmax(0, 1fr)", gap: 24, alignItems: "start" }}>
        <section className="tarjeta" style={{ fontSize: 18 }}>
          <h3 style={{ fontSize: 24, marginBottom: 16 }}>1 · Solicitud</h3>
          <FormSolicitud compacto />
        </section>

        <section className="tarjeta" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h3 style={{ fontSize: 24 }}>2 · Hoja de control</h3>
            <span className="pildora modo">{e?.modo === "n8n" ? "Flujo: n8n" : "Flujo: directo"}</span>
          </div>
          <table className="tabla" style={{ fontSize: 20 }}>
            <thead>
              <tr><th>Folio</th><th>Fecha</th><th>Solicitante</th><th>Artículo</th><th className="num">Monto</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {e?.requisiciones.map((r) => (
                <tr key={r.id} className="entra">
                  <td style={{ fontWeight: 700 }}>{r.folio}</td>
                  <td className="gris">{fechaCorta(r.createdAt)}</td>
                  <td>{r.solicitante}</td>
                  <td>{r.cantidad} × {r.articulo}</td>
                  <td className="num">{$(r.montoEstimado)}</td>
                  <td><span className={`pildora ${r.estado}`}>{ESTADO[r.estado]}</span></td>
                </tr>
              ))}
              {!e?.requisiciones.length && (
                <tr><td colSpan={6} className="gris" style={{ padding: "40px 12px", textAlign: "center" }}>Aún no hay solicitudes</td></tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="tarjeta" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 24, marginBottom: 12 }}>3 · Bandeja de correo</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 560, overflow: "auto" }}>
            {e?.correos.map((c) => {
              const folio = Number(c.asunto.match(/\d{4,}/)?.[0]);
              const esperando = c.conBotones && !c.leido && pendientes.includes(folio);
              return (
                <div key={c.id} className="entra" style={{ background: "var(--tarjeta-2)", borderRadius: 14, padding: 16, borderLeft: esperando ? "4px solid var(--azul)" : "4px solid transparent" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16 }} className="gris">
                    <span>Para: <b style={{ color: "var(--texto)" }}>{c.para}</b></span>
                    <span>{hora(c.createdAt)}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 19, margin: "6px 0" }}>{c.asunto}</div>
                  <div style={{ fontSize: 16, whiteSpace: "pre-line", color: "#c7c7cc", lineHeight: 1.4 }}>{c.cuerpo}</div>
                  {esperando && (
                    <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                      <button className="boton" style={{ flex: 1, padding: "12px 16px" }} disabled={!!ocupado} onClick={() => decidir(c.id, "aprobar")}>
                        {ocupado === c.id + "aprobar" ? "…" : "Aprobar"}
                      </button>
                      <button className="boton secundario" style={{ flex: 1, padding: "12px 16px" }} disabled={!!ocupado} onClick={() => decidir(c.id, "rechazar")}>
                        Rechazar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {!e?.correos.length && <p className="gris" style={{ fontSize: 18, textAlign: "center", padding: "30px 0" }}>Bandeja vacía</p>}
            {aviso && <p className="error">{aviso}</p>}
          </div>
        </section>
      </div>

      <section style={{ marginTop: 28 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 14 }}>
          <h3 style={{ fontSize: 24 }}>Línea de tiempo</h3>
          {e?.actual && <span className="gris" style={{ fontSize: 20 }}>Folio {e.actual.folio}</span>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${pasos.length}, 1fr)`, gap: 12 }}>
          {pasos.map((p, k) => {
            const ev = eventos.find((x) => x.paso === p);
            const siguiente = !ev && (k === 0 || eventos.some((x) => x.paso === pasos[k - 1]));
            return (
              <div key={p} style={{ position: "relative" }}>
                <div style={{ height: 6, borderRadius: 3, background: ev ? (p === "Rechazada" ? "var(--rojo)" : "var(--azul)") : "var(--tarjeta-2)", marginBottom: 12, transition: "background .4s" }} />
                <div className={siguiente && eventos.length ? "pulso" : ""} style={{ fontSize: 20, fontWeight: 600, color: ev ? "var(--texto)" : "var(--gris)" }}>{p}</div>
                <div style={{ fontSize: 18, fontVariantNumeric: "tabular-nums", color: ev ? "var(--azul)" : "transparent" }}>{ev ? hora(ev.createdAt) : "—"}</div>
              </div>
            );
          })}
        </div>
        {extra.length > 0 && <p className="gris" style={{ fontSize: 16, marginTop: 10 }}>{extra.map((x) => `${hora(x.createdAt)} · ${x.paso}`).join("   ")}</p>}
      </section>
    </>
  );
}
