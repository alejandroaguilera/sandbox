"use client";
import { dispositivo } from "@/lib/dispositivo";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Respuesta } from "@/lib/datos";

// Recharts se carga aparte para que la carga inicial de la página sea ligera.
const Grafica = dynamic(() => import("./Grafica"), { ssr: false, loading: () => <div style={{ height: 300 }} /> });

export default function Datos({ preguntas }: { preguntas: string[] }) {
  const [q, setQ] = useState("");
  const [preguntaActual, setPreguntaActual] = useState("");
  const [r, setR] = useState<Respuesta | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    import("./Grafica");
  }, []);

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
      <form onSubmit={(e) => { e.preventDefault(); preguntar(q); }} className="datos-form">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Escribe tu pregunta…"
          className="datos-input"
        />
        <button className="boton datos-boton" disabled={cargando}>Preguntar</button>
      </form>
      <div className="datos-sugerencias">
        {preguntas.map((p) => (
          <button key={p} className="boton secundario" disabled={cargando} onClick={() => { setQ(p); preguntar(p); }}>
            {p}
          </button>
        ))}
      </div>

      {cargando && <div className="tarjeta pulso datos-cargando">Analizando “{preguntaActual}”…</div>}
      {error && <p className="error">{error}</p>}
      {r && !cargando && (
        <div className={`entra datos-resultado ${r.tabla?.filas.length ? "con-tabla" : ""}`}>
          <div className="tarjeta datos-tarjeta">
            <div className="gris datos-pregunta">{preguntaActual}</div>
            <p className="datos-respuesta">{r.respuesta}</p>
            {r.tabla && r.tabla.filas.length > 0 && (
              <div className="tabla-scroll">
              <table className="tabla" style={{ fontSize: "0.8em" }}>
                <thead><tr>{r.tabla.columnas.map((c, i) => <th key={i} className={i ? "num" : ""}>{c}</th>)}</tr></thead>
                <tbody>
                  {r.tabla.filas.slice(0, 6).map((f, i) => (
                    <tr key={i}>{f.map((v, j) => <td key={j} className={j ? "num" : ""}>{String(v)}</td>)}</tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
          <div className="tarjeta datos-tarjeta">
            <h3 className="seccion-titulo" style={{ marginBottom: 12 }}>{r.grafica.titulo}</h3>
            <Grafica g={r.grafica} />
          </div>
        </div>
      )}
    </div>
  );
}
