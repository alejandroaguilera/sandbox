"use client";
import { useState } from "react";
import type { Votacion } from "@/lib/curso/contenido";
import { post } from "./util";

type Votos = Record<string, string>;

/** Tarjeta de una votación abierta. Los votos propios se recuerdan en el dispositivo; se pueden cambiar mientras siga abierta. */
export default function Votar({ def, votos, guardar }: { def: Votacion; votos: Votos; guardar: (k: string, v: string) => void }) {
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const [editando, setEditando] = useState(false);

  async function votar(valor: string, pregunta = "") {
    setError("");
    const k = pregunta ? `${def.id}:${pregunta}` : def.id;
    const antes = votos[k];
    guardar(k, valor); // optimista: el botón responde al instante
    const r = await post("/api/curso/votar", { clave: def.id, pregunta, valor });
    if (!r.ok) {
      guardar(k, antes ?? "");
      setError(r.error);
      return false;
    }
    return true;
  }

  const mia = votos[def.id];
  return (
    <div className="c-tarjeta">
      <span className="c-insignia participa">💬 Participa</span>
      <h3>{def.tipo === "palabra" ? def.frase : def.titulo}</h3>

      {def.tipo === "sino" && (
        <div>
          {def.preguntas!.map((p) => (
            <div className="c-sino" key={p.id}>
              <span>{p.texto}</span>
              <div className="c-chips">
                {(["si", "no"] as const).map((v) => (
                  <button key={v} className="c-chip" aria-pressed={votos[`${def.id}:${p.id}`] === v} onClick={() => votar(v, p.id)}>{v === "si" ? "Sí" : "No"}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {def.tipo === "unica" && (
        <div>
          {def.opciones!.map((o) => (
            <button key={o} className="c-opcion" aria-pressed={mia === o} onClick={() => votar(o)}>{o}</button>
          ))}
        </div>
      )}

      {(def.tipo === "palabra" || def.tipo === "texto") &&
        (mia && !editando ? (
          <>
            <p className="c-ok">✓ Enviado: <b>{mia}</b>. Mira la pantalla.</p>
            <button className="c-btn sec chico" onClick={() => { setTexto(mia); setEditando(true); }}>Cambiar mi respuesta</button>
          </>
        ) : (
          <form onSubmit={async (e) => { e.preventDefault(); const v = texto.trim(); if (v && (await votar(v))) { setEditando(false); setTexto(""); } }}>
            {def.tipo === "palabra" ? (
              <input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={def.max} placeholder="Una palabra" autoCapitalize="none" autoComplete="off" enterKeyHint="send" aria-label="Tu palabra" />
            ) : (
              <textarea value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={def.max} rows={2} placeholder="En una frase (opcional y anónimo)" aria-label="Tu respuesta" />
            )}
            <button className="c-btn" style={{ marginTop: 10 }} disabled={!texto.trim()}>Enviar</button>
          </form>
        ))}

      {(def.tipo === "sino" ? def.preguntas!.some((p) => votos[`${def.id}:${p.id}`]) : def.tipo === "unica" && !!mia) && (
        <p className="c-ok">✓ Registrado. Puedes cambiarlo mientras siga abierta.</p>
      )}
      {error && <p className="c-error">{error}</p>}
    </div>
  );
}
