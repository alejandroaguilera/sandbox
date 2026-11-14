"use client";
import { useEffect, useRef, useState } from "react";
import type { Contenido } from "@/lib/curso/contenido";
import { pedirIA, useGuardado, type MensajeIA } from "./util";

interface Burbuja { rol: "user" | "assistant" | "aviso"; texto: string; rojo?: boolean; copia?: string; fuera?: boolean }
interface Props {
  contenido: Contenido;
  modo: "chat" | "constructor";
  setModo: (m: "chat" | "constructor") => void;
  cola: { texto: string; n: number } | null; // instrucción que llega desde "Probar aquí"
  hayIA: boolean; // hay sesión en vivo y el asistente no está pausado
  motivoSinIA: string;
  restantes: number;
  setRestantes: (n: number) => void;
  alCopiar: (t: string) => void;
}

const IconoEnviar = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 19V5M5 12l7-7 7 7" /></svg>
);

export default function Practicar({ contenido, modo, setModo, cola, hayIA, motivoSinIA, restantes, setRestantes, alCopiar }: Props) {
  // El historial vive solo en esta pestaña del navegador (sessionStorage): el servidor no lo guarda.
  const [chat, setChat] = useGuardado<Burbuja[]>("curso_chat", [], "session");
  const [parcial, setParcial] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [preguntame, setPreguntame] = useState(false);
  const ocupado = parcial !== null;
  const fin = useRef<HTMLDivElement>(null);
  const caja = useRef<HTMLTextAreaElement>(null);
  const chatRef = useRef(chat);
  chatRef.current = chat;

  async function enviar(crudo: string, opciones: { sinTruco?: boolean } = {}) {
    let t = crudo.trim();
    if (!t || ocupado) return;
    if (preguntame && !opciones.sinTruco && !t.includes(contenido.truco)) t = `${t}\n\n${contenido.truco}`;
    const historial: MensajeIA[] = chatRef.current.filter((b) => b.rol !== "aviso" && !b.fuera).slice(-20).map((b) => ({ rol: b.rol as "user" | "assistant", texto: b.texto }));
    setChat((c) => [...c, { rol: "user", texto: t }]);
    setTexto("");
    setParcial("");
    const r = await pedirIA([...historial, { rol: "user", texto: t }], setParcial);
    setParcial(null);
    if (typeof r.restantes === "number") setRestantes(r.restantes);
    setChat((c) => {
      if (r.tipo === "ok") return [...c, { rol: "assistant", texto: r.texto }];
      // Sin respuesta de la IA: el mensaje no cuenta para el historial y se ofrece copiarlo para pegarlo en ChatGPT.
      const sinUltimo = c.map((b, i) => (i === c.length - 1 ? { ...b, fuera: true } : b));
      return [...sinUltimo, { rol: "aviso", texto: r.texto, rojo: r.tipo === "rojo", copia: r.tipo === "rojo" ? undefined : t }];
    });
  }

  // Instrucciones que llegan desde la biblioteca, "Ahora" o el constructor.
  const ultimaCola = useRef(0);
  useEffect(() => {
    if (cola && cola.n !== ultimaCola.current) {
      ultimaCola.current = cola.n;
      enviar(cola.texto, { sinTruco: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cola]);

  useEffect(() => {
    if (modo === "chat" && (chat.length || ocupado)) fin.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [chat.length, parcial, modo, ocupado]);

  const ultimaEsIA = !ocupado && chat.at(-1)?.rol === "assistant";
  return (
    <>
      <h1>Practicar</h1>
      <div className="c-selector" role="group" aria-label="Modo">
        <button aria-pressed={modo === "chat"} onClick={() => setModo("chat")}>Asistente</button>
        <button aria-pressed={modo === "constructor"} onClick={() => setModo("constructor")}>Constructor</button>
      </div>

      <div hidden={modo !== "chat"}>
        <div className="c-aviso">
          <span aria-hidden>🔒</span>
          <span><b>Este asistente no guarda tus conversaciones.</b> Aun así, aplica el semáforo: nada de contraseñas ni datos bancarios.</span>
        </div>

        <div className="c-chat" aria-live="polite">
          {!chat.length && !ocupado && (
            <div className="c-burbuja assistant">Hola. Soy el asistente de práctica del curso. Pídeme algo como se lo dirías a una persona: un correo, una explicación, un plan… Si no sabes qué pedir, escribe “dame ideas”.</div>
          )}
          {chat.map((b, i) => (
            <div key={i} className={`c-burbuja ${b.rol}${b.rojo ? " rojo" : ""}`}>
              {b.texto}
              {b.copia && <button className="c-btn sec chico" onClick={() => alCopiar(b.copia!)}>Copiar mi instrucción</button>}
            </div>
          ))}
          {ocupado && <div className="c-burbuja assistant">{parcial || <span className="c-escribiendo" aria-label="Escribiendo"><i /><i /><i /></span>}</div>}
          {ultimaEsIA && hayIA && (
            <div className="c-chips c-repreguntas">
              {contenido.repreguntas.map((r) => (
                <button key={r} className="c-chip" onClick={() => enviar(r, { sinTruco: true })}>{r}</button>
              ))}
            </div>
          )}
          <div ref={fin} />
        </div>

        <div className="c-redactar">
          {hayIA ? (
            <>
              <label className="c-interruptor">
                <span>Que me pregunte primero</span>
                <input type="checkbox" checked={preguntame} onChange={(e) => setPreguntame(e.target.checked)} />
              </label>
              <form onSubmit={(e) => { e.preventDefault(); enviar(texto); }}>
                <textarea
                  ref={caja} value={texto} rows={1} maxLength={4000} placeholder="Escribe tu instrucción…" aria-label="Tu mensaje" enterKeyHint="send"
                  onChange={(e) => { setTexto(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`; }}
                />
                <button className="c-enviar" disabled={!texto.trim() || ocupado || restantes <= 0} aria-label="Enviar"><IconoEnviar /></button>
              </form>
              <p className="c-contador">
                {restantes > 0 ? <>Te quedan {restantes} mensajes en el sandbox. </> : <>Ya usaste tus mensajes del sandbox. </>}
                Para usar la IA sin límite, abre tu cuenta de ChatGPT o Gemini.
              </p>
            </>
          ) : (
            <div className="c-aviso"><span aria-hidden>💬</span><span><b>{motivoSinIA}</b> Copia tu instrucción y pégala en tu app.</span></div>
          )}
          {chat.length > 0 && !ocupado && (
            <button className="c-btn borde chico" style={{ marginTop: 8 }} onClick={() => setChat([])}>Borrar la conversación</button>
          )}
        </div>
      </div>

      <div hidden={modo !== "constructor"}>
        <Constructor contenido={contenido} hayIA={hayIA && restantes > 0} alCopiar={alCopiar} alProbar={(t) => { setModo("chat"); enviar(t, { sinTruco: true }); }} setRestantes={setRestantes} />
      </div>
    </>
  );
}

function Constructor({ contenido, hayIA, alCopiar, alProbar, setRestantes }: { contenido: Contenido; hayIA: boolean; alCopiar: (t: string) => void; alProbar: (t: string) => void; setRestantes: (n: number) => void }) {
  const { pasos, chipsComo, ideas } = contenido.constructor;
  const [campos, setCampos] = useGuardado<Record<string, string>>("curso_constructor", {}, "session");
  const [verIdeas, setVerIdeas] = useState(false);
  const [versus, setVersus] = useState<{ vaga: string; completa: string; pidioVaga: string } | null>(null);
  const [comparando, setComparando] = useState(false);
  const pon = (id: string, v: string) => setCampos((c) => ({ ...c, [id]: v }));
  const limpio = (id: string) => (campos[id] ?? "").trim();
  const partes = pasos.map((p) => ({ ...p, valor: limpio(p.id) })).filter((p) => p.valor);
  const instruccion = partes.map((p) => (/[.!?…:]$/.test(p.valor) ? p.valor : `${p.valor}.`)).join(" ");
  const lista = !!limpio("que");

  function chip(c: string) {
    const actual = limpio("como");
    if (actual.toLowerCase().includes(c.toLowerCase())) return;
    pon("como", actual ? `${actual.replace(/[.,]$/, "")}, ${c.toLowerCase()}` : c);
  }

  async function comparar() {
    const pidioVaga = limpio("que");
    setComparando(true);
    setVersus({ vaga: "", completa: "", pidioVaga });
    // Dos llamadas (cuentan contra el límite): solo el "Qué" contra la instrucción completa.
    const [a, b] = await Promise.all([
      pedirIA([{ rol: "user", texto: pidioVaga }], (t) => setVersus((v) => v && { ...v, vaga: t })),
      pedirIA([{ rol: "user", texto: instruccion }], (t) => setVersus((v) => v && { ...v, completa: t })),
    ]);
    setVersus({ vaga: a.texto, completa: b.texto, pidioVaga });
    const r = [a.restantes, b.restantes].filter((x): x is number => typeof x === "number");
    if (r.length) setRestantes(Math.min(...r));
    setComparando(false);
  }

  return (
    <>
      <p className="c-sub" style={{ marginBottom: 14 }}>Arma tu instrucción con la fórmula: cuatro preguntas antes de escribir.</p>
      <div className="c-tarjeta">
        {pasos.map((p, i) => (
          <div className="c-paso" key={p.id}>
            <label htmlFor={`paso-${p.id}`}><b>{i + 1} · {p.nombre}</b> {p.pregunta}</label>
            <textarea id={`paso-${p.id}`} rows={p.id === "quien" ? 1 : 2} maxLength={600} placeholder={`Ej. ${p.ejemplo}`} value={campos[p.id] ?? ""} onChange={(e) => pon(p.id, e.target.value)} />
            {p.id === "como" && (
              <div className="c-chips">{chipsComo.map((c) => <button key={c} type="button" className="c-chip" onClick={() => chip(c)}>{c}</button>)}</div>
            )}
            {p.id === "que" && (
              <>
                <button type="button" className="c-btn borde chico" style={{ marginTop: 8 }} onClick={() => setVerIdeas((v) => !v)}>No se me ocurre una tarea</button>
                {verIdeas && (
                  <div style={{ marginTop: 8 }}>
                    {ideas.map((idea) => (
                      <button key={idea} type="button" className="c-opcion" style={{ fontSize: 15, fontWeight: 500 }} onClick={() => { pon("que", idea); setVerIdeas(false); document.getElementById("paso-que")?.focus(); }}>{idea.trim()}…</button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <div className="c-tarjeta">
        <span className="c-eyebrow">Tu instrucción</span>
        <p className="c-previa">
          {partes.length ? partes.map((p) => <span key={p.id}><mark>{p.nombre.toUpperCase()}</mark>{/[.!?…:]$/.test(p.valor) ? p.valor : `${p.valor}.`} </span>) : <span className="vacio">Aquí se va armando conforme llenas los cuatro pasos.</span>}
        </p>
        <div className="c-fila">
          <button className="c-btn" disabled={!lista || !hayIA} onClick={() => alProbar(instruccion)}>Probar aquí</button>
          <button className="c-btn sec" disabled={!lista} onClick={() => alCopiar(instruccion)}>Copiar</button>
        </div>
        <button className="c-btn borde chico" disabled={!lista || partes.length < 2 || !hayIA || comparando} onClick={comparar}>{comparando ? "Comparando…" : "Ver la versión vaga"}</button>
        {!lista && <p className="c-nota">Llena al menos el paso 2 (Qué).</p>}
      </div>

      {versus && (
        <div className="c-tarjeta">
          <h3>La misma petición, dos resultados</h3>
          <div className="c-versus">
            <div>
              <span className="c-eyebrow">Vaga · solo el “Qué”</span>
              <p className="pidio">“{versus.pidioVaga}”</p>
              <p>{versus.vaga || "…"}</p>
            </div>
            <div className="azul-b">
              <span className="c-eyebrow" style={{ color: "var(--azul)" }}>Específica · con la fórmula</span>
              <p>{versus.completa || "…"}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
