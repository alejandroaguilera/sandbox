"use client";
import type { Contenido, Prompt } from "@/lib/curso/contenido";

interface Props { contenido: Contenido; promptAhora: string | null; iaDisponible: boolean; alCopiar: (t: string) => void; alProbar: (t: string) => void }

export function TarjetaPrompt({ p, enPantalla, iaDisponible, alCopiar, alProbar }: { p: Prompt; enPantalla?: boolean; iaDisponible: boolean; alCopiar: (t: string) => void; alProbar: (t: string) => void }) {
  // "Probar aquí" manda la instrucción con su ejemplo (notas, texto del documento) para que funcione sin adjuntos.
  const paraProbar = p.id === "truco" && p.ejemplo ? `${p.ejemplo} ${p.texto}` : p.ejemplo ? `${p.texto}\n\n${p.ejemplo}` : p.texto;
  return (
    <div className={`c-tarjeta c-prompt${enPantalla ? " c-enpantalla" : ""}`}>
      <h3>
        {p.titulo}
        {enPantalla && <span className="c-etiqueta azul">En pantalla ahora</span>}
      </h3>
      {p.nota && <p className="c-nota">{p.nota}</p>}
      <div className="c-cita">{p.texto}</div>
      {p.soloApp && <span className="c-etiqueta">Hazlo en la app de ChatGPT o Gemini ({p.soloApp})</span>}
      {p.truco && <p className="c-nota"><b style={{ color: "var(--texto)" }}>El truco:</b> {p.truco}</p>}
      <div className="c-fila">
        <button className="c-btn chico" onClick={() => alCopiar(p.texto)}>Copiar</button>
        {!p.soloCopiar && (
          <button className="c-btn sec chico" disabled={!!p.soloApp || !iaDisponible} onClick={() => alProbar(paraProbar)}>Probar aquí</button>
        )}
      </div>
    </div>
  );
}

/** Biblioteca: todas las instrucciones de las demos, por bloque. La demo en curso sale arriba y marcada. */
export default function Instrucciones({ contenido, promptAhora, ...acciones }: Props) {
  const ahora = contenido.prompts.find((p) => p.id === promptAhora);
  return (
    <>
      <h1>Instrucciones</h1>
      <p className="c-sub">Las de las demos, listas para copiar y adaptar.</p>
      {ahora && (
        <div style={{ marginTop: 16 }}>
          <TarjetaPrompt p={ahora} enPantalla {...acciones} />
        </div>
      )}
      {contenido.grupos.map((g) => (
        <section key={g.id}>
          <h2>{g.nombre}</h2>
          {contenido.prompts.filter((p) => p.bloque === g.id).map((p) => (
            <TarjetaPrompt key={p.id} p={p} {...acciones} />
          ))}
        </section>
      ))}
    </>
  );
}
