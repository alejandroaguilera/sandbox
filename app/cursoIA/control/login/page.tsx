"use client";
import { useState } from "react";

export default function LoginControl() {
  const [p, setP] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError("");
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: p }) });
    if (r.ok) window.location.href = "/cursoIA/control";
    else {
      setError((await r.json().catch(() => ({}))).error || "No se pudo entrar");
      setEnviando(false);
    }
  }
  return (
    <form className="c-app" onSubmit={entrar} style={{ paddingTop: 80 }}>
      <span className="c-eyebrow">Curso IA desde cero</span>
      <h1 style={{ margin: "4px 0 24px" }}>Control del presentador</h1>
      <div className="campo"><label htmlFor="p">Contraseña</label><input id="p" type="password" autoComplete="current-password" value={p} onChange={(e) => setP(e.target.value)} autoFocus /></div>
      {error && <p className="c-error" style={{ marginBottom: 12 }}>{error}</p>}
      <button className="c-btn" disabled={enviando}>Entrar</button>
    </form>
  );
}
