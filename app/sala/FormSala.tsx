"use client";
import Link from "next/link";
import { useState } from "react";
import { DIMENSIONES, TAMANOS } from "@/lib/constantes";

export default function FormSala() {
  const [dimension, setDimension] = useState("");
  const [tamano, setTamano] = useState("");
  const [proceso, setProceso] = useState("");
  const [sitio, setSitio] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!dimension) return setError("Elige el área donde está tu proceso.");
    if (!tamano) return setError("Elige el tamaño de tu empresa.");
    if (proceso.trim().length < 2) return setError("Escribe el proceso que te duele.");
    setEnviando(true);
    try {
      const r = await fetch("/api/sala", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dimension, tamano, proceso, sitio }),
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
      <div className="movil" style={{ textAlign: "center", paddingTop: 72 }}>
        <div style={{ fontSize: 64 }}>🙌</div>
        <h1 style={{ fontSize: 36, margin: "16px 0" }}>¡Gracias!</h1>
        <p style={{ fontSize: 20, lineHeight: 1.45 }}>
          Anótalo también en la <b>página 2 de tu cuadernillo</b>.
        </p>
        <p className="gris" style={{ fontSize: 17, margin: "8px 0 40px" }}>Mira la pantalla: tu respuesta ya está en vivo.</p>
        <Link href="/material" className="boton bloque">Descargar el material</Link>
      </div>
    );
  }

  return (
    <form className="movil" onSubmit={enviar} noValidate>
      <h1 style={{ fontSize: 32, lineHeight: 1.1 }}>¿Qué proceso te duele más?</h1>
      <p className="gris" style={{ fontSize: 17, margin: "10px 0 28px" }}>Es anónimo. Toma 20 segundos.</p>

      <div className="campo">
        <span className="etiqueta">1. ¿En qué área está?</span>
        <div className="opciones">
          {DIMENSIONES.map((d) => (
            <button type="button" key={d.id} className="opcion" aria-pressed={dimension === d.id} onClick={() => setDimension(d.id)}>
              <b>{d.nombre}</b>
              <span>{d.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="campo">
        <span className="etiqueta">2. ¿Cuántas personas trabajan en tu empresa?</span>
        <div className="opciones dos">
          {TAMANOS.map((t) => (
            <button type="button" key={t.id} className="opcion" aria-pressed={tamano === t.id} onClick={() => setTamano(t.id)}>
              {t.nombre}
            </button>
          ))}
        </div>
      </div>

      <div className="campo">
        <label htmlFor="proceso">3. ¿Qué proceso te duele?</label>
        <textarea id="proceso" maxLength={160} rows={3} placeholder="Ej. perseguir pagos de clientes" value={proceso} onChange={(e) => setProceso(e.target.value)} />
        <div className="contador-chars">{proceso.length}/160</div>
      </div>

      <div className="oculto-bot" aria-hidden="true">
        <label>No llenar <input tabIndex={-1} autoComplete="off" value={sitio} onChange={(e) => setSitio(e.target.value)} /></label>
      </div>

      {error && <p className="error">{error}</p>}
      <button className="boton bloque" disabled={enviando}>{enviando ? "Enviando…" : "Enviar"}</button>
    </form>
  );
}
