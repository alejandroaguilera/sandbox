"use client";
import { useEffect, useRef, useState } from "react";
import type { Contenido, Momento } from "@/lib/curso/contenido";
import Instrucciones from "./Instrucciones";
import MeLlevo from "./MeLlevo";
import Practicar from "./Practicar";
import Votar from "./Votar";
import { copiar, ETIQUETA_TIPO, horaBloque, useEstado, useGuardado } from "./util";

type Tab = "ahora" | "practicar" | "instrucciones" | "mellevo";
const TABS: { id: Tab; nombre: string; icono: React.ReactNode }[] = [
  { id: "ahora", nombre: "Ahora", icono: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></> },
  { id: "practicar", nombre: "Practicar", icono: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" /> },
  { id: "instrucciones", nombre: "Instrucciones", icono: <><rect x="8" y="8" width="12" height="12" rx="2.5" /><path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" /></> },
  { id: "mellevo", nombre: "Me llevo", icono: <><path d="M6 8h12l-1 12H7L6 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></> },
];

export default function App({ contenido, material }: { contenido: Contenido; material: Record<string, boolean> }) {
  const { estado, sinRed } = useEstado();
  const s = estado?.sesion ?? null;
  const llave = s ? `${s.codigo}:${s.epoca}` : "sin-sesion";
  const [tab, setTab] = useState<Tab>("ahora");
  const [modo, setModo] = useState<"chat" | "constructor">("chat");
  const [cola, setCola] = useState<{ texto: string; n: number } | null>(null);
  const [toast, setToast] = useState("");
  const [bienvenida, setBienvenida, bienvenidaLista] = useGuardado<{ visto: boolean; apodo: string }>("curso_bienvenida", { visto: false, apodo: "" });
  const [apodo, setApodo] = useState("");
  const [votos, setVotos] = useGuardado<Record<string, string>>(`curso_votos:${llave}`, {});
  const [usados, setUsados] = useGuardado<number | null>(`curso_restantes:${llave}`, null);
  const restantes = usados ?? estado?.maxMensajes ?? 25;

  const momento: Momento | null = (s?.momentoId && contenido.momentos.find((m) => m.id === s.momentoId)) || null;
  const bloque = momento && contenido.bloques.find((b) => b.id === momento.bloque);
  const promptAhora = momento?.accion?.tipo === "prompt" ? contenido.prompts.find((p) => p.id === (momento.accion as { promptId: string }).promptId) ?? null : null;
  const hayIA = !!s && !s.iaPausada && !s.sinIA;
  const motivoSinIA = !s ? "El asistente solo está disponible durante el curso." : "Seguimos con la app de ChatGPT.";

  // Al cambiar el momento, la tarjeta parpadea y el celular vibra (si puede).
  const [cambio, setCambio] = useState(0);
  const anterior = useRef<string | null | undefined>(undefined);
  const abiertasAntes = useRef("");
  const [aviso, setAviso] = useState(false);
  useEffect(() => {
    if (!estado) return;
    const id = s?.momentoId ?? null;
    const abiertas = estado.abiertas.join(",");
    const nuevaVotacion = estado.abiertas.some((a) => !abiertasAntes.current.split(",").includes(a));
    if (anterior.current !== undefined && (anterior.current !== id || nuevaVotacion)) {
      setCambio((c) => c + 1);
      try { navigator.vibrate?.(80); } catch {}
      setAviso(true);
    }
    anterior.current = id;
    abiertasAntes.current = abiertas;
  }, [estado, s?.momentoId]);
  useEffect(() => { if (tab === "ahora") setAviso(false); }, [tab, cambio]);

  const tostar = (m: string) => { setToast(m); setTimeout(() => setToast(""), 1800); };
  const alCopiar = async (t: string) => tostar((await copiar(t)) ? "✓ Copiado" : "No se pudo copiar: mantén presionado el texto");
  const ir = (t: Tab) => { setTab(t); window.scrollTo(0, 0); };
  const alProbar = (t: string) => { setModo("chat"); setCola({ texto: t, n: Date.now() }); ir("practicar"); };
  const irSeccion = (sec: string) => { setTab("mellevo"); setTimeout(() => document.getElementById(`ml-${sec}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60); };

  function accionMomento(m: Momento) {
    const a = m.accion;
    if (!a) return null;
    if (a.tipo === "chatgpt") return <a className="c-btn" href="https://chatgpt.com" target="_blank" rel="noopener noreferrer">Abrir ChatGPT</a>;
    if (a.tipo === "practicar") return <button className="c-btn" onClick={() => { setModo(a.modo); ir("practicar"); }}>Ir a practicar</button>;
    if (a.tipo === "semaforo") return <button className="c-btn" onClick={() => irSeccion("semaforo")}>Jugar</button>;
    if (a.tipo === "mellevo") return <button className="c-btn" onClick={() => irSeccion(a.seccion)}>{a.seccion === "preguntas" ? "Escribir mi pregunta" : a.seccion === "evaluacion" ? "Responder" : "Ver en “Me llevo”"}</button>;
    if (a.tipo === "votacion") return estado?.abiertas.includes(a.votacionId) ? <p className="c-nota">👇 Vota aquí abajo.</p> : <p className="c-nota">La votación se abre en un momento…</p>;
    if (a.tipo === "prompt" && promptAhora)
      return (
        <>
          {promptAhora.nota && <p className="c-nota">{promptAhora.nota}</p>}
          <div className="c-cita">{promptAhora.texto}</div>
          {promptAhora.soloApp && <span className="c-etiqueta">Hazlo en la app de ChatGPT o Gemini ({promptAhora.soloApp})</span>}
          <div className="c-fila">
            <button className="c-btn" onClick={() => alCopiar(promptAhora.texto)}>Copiar instrucción</button>
            {!promptAhora.soloApp && !promptAhora.soloCopiar && hayIA && <button className="c-btn sec" onClick={() => alProbar(promptAhora.ejemplo ? (promptAhora.id === "truco" ? `${promptAhora.ejemplo} ${promptAhora.texto}` : `${promptAhora.texto}\n\n${promptAhora.ejemplo}`) : promptAhora.texto)}>Probar aquí</button>}
          </div>
        </>
      );
    return null;
  }

  const idxBloque = bloque ? contenido.bloques.findIndex((b) => b.id === bloque.id) : -1;
  const votacionesAbiertas = contenido.votaciones.filter((v) => estado?.abiertas.includes(v.id));
  const horaInicio = s ? horaBloque(s.fecha, "0:00") : "";

  return (
    <div className="c-app">
      {bienvenidaLista && !bienvenida.visto && (
        <div className="c-bienvenida">
          <div>
            <span className="c-eyebrow">{contenido.curso}</span>
            <h1>Bienvenido al curso.</h1>
            <p style={{ fontSize: 20, color: "var(--gris)", marginBottom: 28 }}>Aquí vas a practicar y guardar todo lo que veamos hoy.</p>
            <div className="campo">
              <label htmlFor="apodo">¿Cómo te llamamos? <span className="gris" style={{ fontWeight: 400 }}>(opcional)</span></label>
              <input id="apodo" value={apodo} onChange={(e) => setApodo(e.target.value)} maxLength={20} placeholder="Solo un apodo" autoComplete="off" />
              <small>Se queda en tu celular: no se envía a ningún lado.</small>
            </div>
            <button className="c-btn" onClick={() => setBienvenida({ visto: true, apodo: apodo.trim() })}>Empezar</button>
          </div>
        </div>
      )}

      <div hidden={tab !== "ahora"}>
        <span className="c-eyebrow">{contenido.curso}</span>
        <h1 style={{ marginTop: 4 }}>{bienvenida.apodo ? `Hola, ${bienvenida.apodo}` : "Ahora"}</h1>
        {sinRed && <p className="c-error" style={{ marginTop: 8 }}>Sin conexión. Reintentando…</p>}

        <div style={{ marginTop: 16 }}>
          {!estado ? (
            <div className="c-tarjeta"><p className="c-nota pulso">Conectando con el curso…</p></div>
          ) : !s ? (
            <div className="c-tarjeta">
              <h3>El curso no está en vivo en este momento.</h3>
              <p className="c-nota">Aquí sigue todo tu material: las instrucciones para copiar, el constructor, la guía de bolsillo y tu reto de 7 días.</p>
              <button className="c-btn" onClick={() => ir("instrucciones")}>Ver las instrucciones</button>
            </div>
          ) : !momento ? (
            <div className="c-tarjeta c-ahora">
              <span className="c-insignia info">En un momento</span>
              <h3 style={{ fontSize: 22 }}>El curso empieza a las {horaInicio}.</h3>
              <p className="c-nota">{s.wifi ? <>Mientras, conecta tu celular al Wi-Fi: <b style={{ color: "var(--texto)" }}>{s.wifi}</b>.</> : "Mientras, deja abierta esta página: la vamos a usar todo el curso."}</p>
            </div>
          ) : (
            <div key={cambio} className={`c-tarjeta c-ahora${cambio ? " cambio" : ""}`}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span className={`c-insignia ${momento.tipo}`}>{ETIQUETA_TIPO[momento.tipo]}</span>
                {bloque && <span className="c-eyebrow">{bloque.id} · {bloque.nombre}</span>}
              </div>
              <h3 style={{ fontSize: 23 }}>{momento.titulo}</h3>
              <p>{momento.instruccion}</p>
              {accionMomento(momento)}
            </div>
          )}

          {votacionesAbiertas.map((v) => (
            <Votar key={v.id} def={v} votos={votos} guardar={(k, val) => setVotos((x) => ({ ...x, [k]: val }))} />
          ))}
        </div>

        <h2>El curso</h2>
        <div className="c-tarjeta">
          <ol className="c-linea">
            {contenido.bloques.filter((b) => b.id !== "00").map((b) => {
              const i = contenido.bloques.findIndex((x) => x.id === b.id);
              const clase = i === idxBloque ? "actual" : i < idxBloque ? "pasado" : "";
              return (
                <li key={b.id} className={clase}>
                  <span className="marca">{clase === "pasado" ? "✓" : ""}</span>
                  <span>{b.nombre}</span>
                  <span className="c-hora">{horaBloque(s?.fecha, b.hora)}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <div hidden={tab !== "practicar"}>
        <Practicar contenido={contenido} modo={modo} setModo={setModo} cola={cola} hayIA={hayIA} motivoSinIA={motivoSinIA} restantes={restantes} setRestantes={(n) => setUsados(n)} alCopiar={alCopiar} />
      </div>
      <div hidden={tab !== "instrucciones"}>
        <Instrucciones contenido={contenido} promptAhora={promptAhora?.id ?? null} iaDisponible={hayIA} alCopiar={alCopiar} alProbar={alProbar} />
      </div>
      <div hidden={tab !== "mellevo"}>
        <MeLlevo contenido={contenido} llave={llave} enVivo={!!s} visible={tab === "mellevo"} material={material} alCopiar={alCopiar} />
      </div>

      <footer className="c-pie">MrHapps · Curso IA desde cero{s ? ` · ${s.cliente}` : ""}<br /><a href="/cursoIA/privacidad">Privacidad</a></footer>

      {toast && <div className="c-toast" role="status">{toast}</div>}
      <nav className="c-nav" aria-label="Secciones">
        <div>
          {TABS.map((t) => (
            <button key={t.id} aria-current={tab === t.id ? "page" : undefined} onClick={() => ir(t.id)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{t.icono}</svg>
              {t.nombre}
              {t.id === "ahora" && aviso && tab !== "ahora" && <span className="c-punto" />}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
