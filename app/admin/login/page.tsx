"use client";
import { useState } from "react";

export default function Login() {
  const [p, setP] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError("");
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: p }) });
    if (r.ok) window.location.href = "/admin";
    else {
      setError((await r.json().catch(() => ({}))).error || "No se pudo entrar");
      setEnviando(false);
    }
  }
  return (
    <form className="movil" onSubmit={entrar} style={{ paddingTop: 80 }}>
      <h1 style={{ fontSize: 32, marginBottom: 24 }}>Admin</h1>
      <div className="campo"><label htmlFor="p">Contraseña</label><input id="p" type="password" autoComplete="current-password" value={p} onChange={(e) => setP(e.target.value)} autoFocus /></div>
      {error && <p className="error">{error}</p>}
      <button className="boton bloque" disabled={enviando}>Entrar</button>
    </form>
  );
}
