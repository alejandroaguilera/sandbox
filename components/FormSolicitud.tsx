"use client";
import { useState } from "react";

const INICIAL = { solicitante: "", area: "", articulo: "", cantidad: "1", montoEstimado: "", motivo: "" };

export default function FormSolicitud({ compacto = false }: { compacto?: boolean }) {
  const [f, setF] = useState(INICIAL);
  const [estado, setEstado] = useState<"" | "enviando" | "ok">("");
  const [error, setError] = useState("");
  const campo = (k: keyof typeof INICIAL) => ({
    value: f[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value }),
  });

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!f.solicitante || !f.area || !f.articulo || !f.cantidad || !f.montoEstimado) return setError("Completa todos los campos con *.");
    setEstado("enviando");
    try {
      const r = await fetch("/api/compras/solicitar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, montoEstimado: f.montoEstimado.replace(/[$,\s]/g, "") }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "No se pudo enviar");
      setEstado("ok");
      setF(INICIAL);
      setTimeout(() => setEstado(""), 4000);
    } catch (err) {
      setError((err as Error).message);
      setEstado("");
    }
  }

  const s = compacto ? { marginBottom: 12 } : undefined;
  return (
    <form onSubmit={enviar} noValidate>
      <div className="campo" style={s}><label>Solicitante *</label><input placeholder="Tu nombre" {...campo("solicitante")} /></div>
      <div className="campo" style={s}><label>Área *</label><input placeholder="Ej. Almacén" {...campo("area")} /></div>
      <div className="campo" style={s}><label>Artículo *</label><input placeholder="Ej. Tarimas de madera" {...campo("articulo")} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 12 }}>
        <div className="campo" style={s}><label>Cantidad *</label><input type="number" inputMode="numeric" min={1} {...campo("cantidad")} /></div>
        <div className="campo" style={s}><label>Monto estimado *</label><input inputMode="decimal" placeholder="$" {...campo("montoEstimado")} /></div>
      </div>
      <div className="campo" style={s}><label>Motivo</label><input placeholder="¿Para qué se necesita?" {...campo("motivo")} /></div>
      {error && <p className="error">{error}</p>}
      <button className="boton bloque" disabled={estado === "enviando"}>
        {estado === "enviando" ? "Enviando…" : estado === "ok" ? "✓ Solicitud enviada" : "Enviar solicitud"}
      </button>
    </form>
  );
}
