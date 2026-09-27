"use client";
import Link from "next/link";
import { useState } from "react";
import { TAMANOS } from "@/lib/constantes";

const INICIAL = { nombre: "", empresa: "", correo: "", whatsapp: "", giro: "", procesoDoloroso: "", sitio: "" };

export default function FormMaterial() {
  const [f, setF] = useState(INICIAL);
  const [tamano, setTamano] = useState("");
  const [diag, setDiag] = useState(false);
  const [consent, setConsent] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState(false);

  const campo = (k: keyof typeof INICIAL) => ({
    value: f[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value }),
  });

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!f.nombre.trim() || !f.empresa.trim() || !f.correo.trim() || !tamano) return setError("Completa los campos obligatorios (*).");
    if (!consent) return setError("Necesitamos tu consentimiento para enviarte el material.");
    setEnviando(true);
    try {
      const r = await fetch("/api/material", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, tamano, quiereDiagnostico: diag, consentimiento: consent }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "No se pudo enviar. Intenta de nuevo.");
      setListo(true);
      window.scrollTo(0, 0);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  if (listo) {
    return (
      <div className="movil" style={{ textAlign: "center", paddingTop: 56 }}>
        <div style={{ fontSize: 60 }}>📥</div>
        <h1 style={{ fontSize: 34, margin: "16px 0 8px" }}>¡Listo, {f.nombre.split(" ")[0]}!</h1>
        <p className="gris" style={{ fontSize: 18, marginBottom: 36 }}>Descarga tu material:</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <a className="boton bloque" href="/material/laminas.pdf" download>Láminas (PDF)</a>
          <a className="boton bloque secundario" href="/material/cuadernillo.pdf" download>Cuadernillo de trabajo (PDF)</a>
        </div>
        {diag && <p className="gris" style={{ fontSize: 16, marginTop: 32 }}>Te contactaremos con información del Diagnóstico de Madurez Digital.</p>}
      </div>
    );
  }

  return (
    <form className="movil" onSubmit={enviar} noValidate>
      <h1 style={{ fontSize: 32, lineHeight: 1.1 }}>Llévate el material</h1>
      <p className="gris" style={{ fontSize: 17, margin: "10px 0 28px" }}>Láminas del workshop y cuadernillo de trabajo.</p>

      <div className="campo"><label htmlFor="nombre">Nombre *</label><input id="nombre" autoComplete="name" required {...campo("nombre")} /></div>
      <div className="campo"><label htmlFor="empresa">Empresa *</label><input id="empresa" autoComplete="organization" required {...campo("empresa")} /></div>
      <div className="campo"><label htmlFor="correo">Correo *</label><input id="correo" type="email" inputMode="email" autoComplete="email" required {...campo("correo")} /></div>
      <div className="campo"><label htmlFor="whatsapp">WhatsApp</label><input id="whatsapp" type="tel" inputMode="tel" autoComplete="tel" {...campo("whatsapp")} /></div>
      <div className="campo">
        <span className="etiqueta">Tamaño de la empresa *</span>
        <div className="opciones dos">
          {TAMANOS.map((t) => (
            <button type="button" key={t.id} className="opcion" aria-pressed={tamano === t.id} onClick={() => setTamano(t.id)}>
              {t.nombre}
            </button>
          ))}
        </div>
        <small>Número de personas que trabajan en ella.</small>
      </div>
      <div className="campo"><label htmlFor="giro">Giro</label><input id="giro" placeholder="Ej. distribución, restaurante, manufactura" {...campo("giro")} /></div>
      <div className="campo"><label htmlFor="proc">El proceso que más te duele</label><textarea id="proc" rows={2} maxLength={300} {...campo("procesoDoloroso")} /></div>

      <div className="oculto-bot" aria-hidden="true">
        <label>No llenar <input tabIndex={-1} autoComplete="off" {...campo("sitio")} /></label>
      </div>

      <label className="check">
        <input type="checkbox" checked={diag} onChange={(e) => setDiag(e.target.checked)} />
        <span><b>Quiero información del Diagnóstico de Madurez Digital</b></span>
      </label>
      <label className="check">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          Acepto el <Link href="/privacidad" target="_blank">aviso de privacidad</Link> y que me contacten para enviarme el material y dar seguimiento. *
        </span>
      </label>

      {error && <p className="error">{error}</p>}
      <button className="boton bloque" disabled={enviando}>{enviando ? "Enviando…" : "Descargar material"}</button>
    </form>
  );
}
