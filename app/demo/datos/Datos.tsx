"use client";
import { dispositivo } from "@/lib/dispositivo";
import { useState } from "react";
import Grafica from "./Grafica";
import type { Respuesta } from "@/lib/datos";

export default function Datos({ preguntas }: { preguntas: string[] }) {
  const [q, setQ] = useState("");
  const [preguntaActual, setPreguntaActual] = useState("");
  const [r, setR] = useState<Respuesta | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function preguntar(texto: string) {
    const t = texto.trim();
    if (t.length < 3 || cargando) return;
    setCargando(true);
    setError("");
    setPreguntaActual(t);
    setR(null);
    try {
      const res = await fetch("/api/datos/preguntar", { method: "POST", headers: { "Content-Type": "application/json", ...dispositivo() }, body: JSON.stringify({ pregunta: t }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "No se pudo responder");
      setR(j);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); preguntar(q); }} style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Escribe tu pregunta…"
          style={{ fontSize: 34, padding: "22px 28px", borderRadius: 22, flex: 1 }}
        />
        <button className="boton" style={{ fontSize: 26, padding: "0 40px" }} disabled={cargando}>Preguntar</button>
      </form>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
        {preguntas.map((p) => (
          <button key={p} className="boton secundario" style={{ fontSize: 21, padding: "12px 22px" }} disabled={cargando} onClick={() => { setQ(p); preguntar(p); }}>
            {p}
          </button>
        ))}
      </div>

      {cargando && <div className="tarjeta pulso" style={{ fontSize: 30, padding: 40 }}>Analizando “{preguntaActual}”…</div>}
      {error && <p className="error" style={{ fontSize: 24 }}>{error}</p>}
      {r && !cargando && (
        <div className="entra" style={{ display: "grid", gridTemplateColumns: r.tabla?.filas.length ? "minmax(0, 1fr) minmax(0, 1.25fr)" : "1fr", gap: 24 }}>
          <div className="tarjeta" style={{ padding: 32 }}>
            <div className="gris" style={{ fontSize: 20, marginBottom: 10 }}>{preguntaActual}</div>
            <p style={{ fontSize: 31, lineHeight: 1.35, margin: "0 0 20px", fontWeight: 500 }}>{r.respuesta}</p>
            {r.tabla && r.tabla.filas.length > 0 && (
              <table className="tabla" style={{ fontSize: 19 }}>
                <thead><tr>{r.tabla.columnas.map((c, i) => <th key={i} className={i ? "num" : ""}>{c}</th>)}</tr></thead>
                <tbody>
                  {r.tabla.filas.slice(0, 6).map((f, i) => (
                    <tr key={i}>{f.map((v, j) => <td key={j} className={j ? "num" : ""}>{String(v)}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="tarjeta" style={{ padding: "28px 28px 16px" }}>
            <h3 style={{ fontSize: 26, marginBottom: 12 }}>{r.grafica.titulo}</h3>
            <Grafica g={r.grafica} />
          </div>
        </div>
      )}
    </div>
  );
}
