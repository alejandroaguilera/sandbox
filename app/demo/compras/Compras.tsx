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
const fechaCorta = (s: string) => new Date(s).toLocaleDateString("es-MX", { day: "numeric", month: "short" }).replace(".", "");
const ESTADO: Record<string, string> = { PENDIENTE: "Pendiente", APROBADA: "Aprobada", RECHAZADA: "Rechazada" };
const iniciales = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

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

  // Seguimiento: pasos esperados + lo que realmente pasó (con hora al segundo).
  const eventos = e?.eventos ?? [];
  const rechazada = eventos.some((x) => x.paso === "Rechazada");
  const pasos = PASOS.map((p) => (p === "Aprobada" && rechazada ? "Rechazada" : p));
  const extra = eventos.filter((x) => !pasos.includes(x.paso));
  const pendientes = e?.requisiciones.filter((r) => r.estado === "PENDIENTE").map((r) => r.folio) ?? [];

  return (
    <>
      <section className="seguimiento">
        <div className="seguimiento-cab">
          <b>Seguimiento</b>
          <span className="gris">{e?.actual ? `Folio ${e.actual.folio}` : "Esperando la primera solicitud"}</span>
          <span className="pildora modo">{e?.modo === "n8n" ? "Flujo: n8n" : "Flujo: directo"}</span>
        </div>
        <ol className="pasos">
          {pasos.map((p, k) => {
            const ev = eventos.find((x) => x.paso === p);
            const siguiente = !ev && eventos.length > 0 && eventos.some((x) => x.paso === pasos[k - 1]);
            const clase = ev ? (p === "Rechazada" ? "rechazo" : "hecho") : siguiente ? "siguiente" : "";
            return (
              <li key={p} className={`paso ${clase}`}>
                <span className="paso-punto" />
                <div className={`paso-nombre ${siguiente ? "pulso" : ""}`}>{p}</div>
                <div className="paso-hora">{ev ? hora(ev.createdAt) : "—"}</div>
              </li>
            );
          })}
        </ol>
        {extra.length > 0 && <p className="gris paso-extra">{extra.map((x) => `${hora(x.createdAt)} · ${x.paso}`).join("   ")}</p>}
      </section>

      <div className="compras-grid">
        <Panel n={1} icono="form" app="Formulario" contexto="Lo llena quien necesita la compra">
          <div className="panel-cuerpo">
            <FormSolicitud compacto />
          </div>
        </Panel>

        <Conector texto="se registra" />

        <Panel n={2} icono="hoja" app="Hoja de control" contexto="Compras 2026 · se llena sola">
          <div className="panel-cuerpo sin-relleno">
            <table className="hoja">
              <thead>
                <tr><th className="hoja-n"></th><th>Folio</th><th className="col-fecha">Fecha</th><th>Solicitante</th><th>Artículo</th><th className="num">Monto</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {e?.requisiciones.map((r, i) => (
                  <tr key={r.id} className="entra">
                    <td className="hoja-n">{i + 1}</td>
                    <td style={{ fontWeight: 700 }}>{r.folio}</td>
                    <td className="gris col-fecha">{fechaCorta(r.createdAt)}</td>
                    <td className="hoja-texto" title={r.solicitante}>{r.solicitante}</td>
                    <td className="hoja-texto" title={`${r.cantidad} × ${r.articulo}`}>{r.cantidad} × {r.articulo}</td>
                    <td className="num">{$(r.montoEstimado)}</td>
                    <td><span className={`pildora ${r.estado}`}>{ESTADO[r.estado]}</span></td>
                  </tr>
                ))}
                {!e?.requisiciones.length && (
                  <tr><td colSpan={7} className="gris hoja-vacia">Aún no hay solicitudes</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Conector texto="avisa por correo" />

        <Panel n={3} icono="correo" app="Correo" contexto="Avisos que manda el sistema">
          <div className="panel-cuerpo sin-relleno">
            {e?.correos.map((c) => {
              const folio = Number(c.asunto.match(/\d{4,}/)?.[0]);
              const esperando = c.conBotones && !c.leido && pendientes.includes(folio);
              return (
                <div key={c.id} className={`correo entra ${esperando ? "esperando" : ""}`}>
                  <div className="correo-avatar">{iniciales(c.para)}</div>
                  <div className="correo-cont">
                    <div className="correo-linea">
                      <span className="correo-para">{c.para}</span>
                      <span className="gris correo-hora">{hora(c.createdAt)}</span>
                    </div>
                    <div className="correo-asunto">{c.asunto}</div>
                    <div className={`correo-cuerpo ${esperando ? "" : "recortado"}`}>{c.cuerpo}</div>
                    {esperando && (
                      <div className="correo-acciones">
                        <button className="boton" disabled={!!ocupado} onClick={() => decidir(c.id, "aprobar")}>
                          {ocupado === c.id + "aprobar" ? "…" : "Aprobar"}
                        </button>
                        <button className="boton secundario" disabled={!!ocupado} onClick={() => decidir(c.id, "rechazar")}>
                          Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {!e?.correos.length && <p className="gris hoja-vacia">Bandeja vacía</p>}
            {aviso && <p className="error" style={{ padding: "0 16px" }}>{aviso}</p>}
          </div>
        </Panel>
      </div>
    </>
  );
}

function Panel({ n, icono, app, contexto, children }: { n: number; icono: "form" | "hoja" | "correo"; app: string; contexto: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <header className="panel-cab">
        <span className={`panel-icono ico-${icono}`}><Icono tipo={icono} /></span>
        <div style={{ minWidth: 0 }}>
          <div className="panel-app"><span className="gris">{n} ·</span> {app}</div>
          <div className="panel-contexto">{contexto}</div>
        </div>
      </header>
      {children}
    </section>
  );
}

function Conector({ texto }: { texto: string }) {
  return (
    <div className="conector" aria-hidden>
      <span className="conector-flecha">→</span>
      <span className="conector-texto">{texto}</span>
    </div>
  );
}

function Icono({ tipo }: { tipo: "form" | "hoja" | "correo" }) {
  const p = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (tipo === "form") return <svg {...p}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>;
  if (tipo === "hoja") return <svg {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M3 15h18M9 4v16" /></svg>;
  return <svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>;
}
