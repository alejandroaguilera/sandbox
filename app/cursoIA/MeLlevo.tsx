"use client";
import { useEffect, useState } from "react";
import type { Contenido } from "@/lib/curso/contenido";
import { post, useGuardado } from "./util";

interface Props { contenido: Contenido; llave: string; enVivo: boolean; visible: boolean; material: Record<string, boolean>; alCopiar: (t: string) => void }
const COLORES = [["verde", "Adelante"], ["amarillo", "Ajusta esto"], ["rojo", "Nunca"]] as const;

function Semaforo({ contenido, llave }: { contenido: Contenido; llave: string }) {
  const casos = contenido.semaforo;
  const [resp, setResp] = useGuardado<Record<string, string>>(`curso_semaforo:${llave}`, {});
  const [i, setI] = useState(0);
  const [empezo, setEmpezo] = useState(false);
  const contestadas = casos.filter((c) => resp[c.id]).length;
  const aciertos = casos.filter((c) => resp[c.id] === c.respuesta).length;
  const termino = contestadas === casos.length;
  const caso = casos[Math.min(i, casos.length - 1)];
  const elegida = resp[caso.id];

  useEffect(() => { setI(Math.min(contestadas, casos.length - 1)); /* retoma donde se quedó */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [llave]);

  if (termino && (i >= casos.length || !empezo)) {
    return (
      <div className="c-tarjeta" style={{ textAlign: "center" }}>
        <span className="c-eyebrow">El semáforo</span>
        <p className="c-resultado">Acertaste {aciertos} de {casos.length}</p>
        <p className="c-nota">La pregunta no es qué subes, sino en qué cuenta y con qué ajustes.</p>
        <button className="c-btn sec chico" onClick={() => { setResp({}); setI(0); setEmpezo(true); }}>Jugar otra vez</button>
      </div>
    );
  }
  if (!empezo && contestadas === 0) {
    return (
      <div className="c-tarjeta">
        <h3>El semáforo · juego de 2 minutos</h3>
        <p className="c-nota">8 casos. Tú decides: ¿verde, amarillo o rojo?</p>
        <button className="c-btn" onClick={() => setEmpezo(true)}>Empezar</button>
      </div>
    );
  }
  function elegir(color: string) {
    if (elegida) return;
    setResp((r) => ({ ...r, [caso.id]: color }));
    post("/api/curso/semaforo", { tarjeta: caso.id, respuesta: color }); // solo alimenta la gráfica del proyector
  }
  return (
    <div className="c-tarjeta">
      <div style={{ display: "flex", justifyContent: "space-between" }}><span className="c-eyebrow">El semáforo</span><span className="c-eyebrow">{Math.min(i + 1, casos.length)} de {casos.length}</span></div>
      <div className="c-progreso"><div style={{ width: `${(contestadas / casos.length) * 100}%` }} /></div>
      <p className="c-semaforo-caso">{caso.caso}</p>
      <div className="c-luces">
        {COLORES.map(([color, nombre]) => (
          <button key={color} disabled={!!elegida} onClick={() => elegir(color)}
            className={`c-luz ${color}${elegida === color ? " elegida" : ""}${elegida && caso.respuesta === color ? " correcta" : ""}`}>
            <i />{nombre}
          </button>
        ))}
      </div>
      {elegida && (
        <>
          <p><b>{elegida === caso.respuesta ? "✓ Correcto." : "✗ Casi."}</b> {caso.explicacion}</p>
          <button className="c-btn" onClick={() => { setEmpezo(true); setI(i + 1); }}>{i + 1 < casos.length ? "Siguiente" : "Ver mi resultado"}</button>
        </>
      )}
    </div>
  );
}

function Reto({ contenido, alCopiar }: { contenido: Contenido; alCopiar: (t: string) => void }) {
  const [hechos, setHechos] = useGuardado<number[]>("curso_reto", []);
  const [ics, setIcs] = useState("/api/curso/reto.ics");
  useEffect(() => {
    // El reto empieza mañana, según la fecha del celular.
    const m = new Date(Date.now() + 86_400_000);
    setIcs(`/api/curso/reto.ics?inicio=${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}-${String(m.getDate()).padStart(2, "0")}`);
  }, []);
  return (
    <div className="c-tarjeta">
      <p className="c-nota">Úsala una vez al día, durante una semana. {hechos.length > 0 && <b style={{ color: "var(--texto)" }}>Llevas {hechos.length} de 7.</b>}</p>
      <a className="c-btn" href={ics}>Agréguelo a mi calendario</a>
      <p className="c-nota">Descarga 7 recordatorios diarios a las 9:00 am, cada uno con su instrucción.</p>
      <div>
        {contenido.reto.map((r) => {
          const hecho = hechos.includes(r.dia);
          return (
            <div className={`c-dia${hecho ? " hecho" : ""}`} key={r.dia}>
              <button className="c-check" aria-pressed={hecho} aria-label={`Día ${r.dia} ${hecho ? "hecho" : "pendiente"}`} onClick={() => setHechos((h) => (hecho ? h.filter((d) => d !== r.dia) : [...h, r.dia]))}>{hecho ? "✓" : r.dia}</button>
              <div>
                <h3>Día {r.dia} · {r.titulo}</h3>
                <p className="c-nota" style={{ margin: "4px 0 8px" }}>{r.instruccion}</p>
                <button className="c-btn sec chico" style={{ width: "auto" }} onClick={() => alCopiar(r.instruccion)}>Copiar instrucción</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface PreguntaSala { id: string; texto: string; votos: number; respondida: boolean }
function Preguntas({ enVivo, visible }: { enVivo: boolean; visible: boolean }) {
  const [lista, setLista] = useState<PreguntaSala[]>([]);
  const [votadas, setVotadas] = useState<string[]>([]);
  const [texto, setTexto] = useState("");
  const [msg, setMsg] = useState("");
  const cargar = async () => {
    try {
      const j = await (await fetch("/api/curso/preguntas", { cache: "no-store" })).json();
      setLista(j.preguntas ?? []);
      setVotadas(j.votadas ?? []);
    } catch {}
  };
  useEffect(() => {
    if (!enVivo || !visible) return;
    cargar();
    const t = setInterval(() => !document.hidden && cargar(), 5000);
    return () => clearInterval(t);
  }, [enVivo, visible]);

  if (!enVivo) return <div className="c-tarjeta"><p className="c-nota">Las preguntas para la sala se reciben durante el curso.</p></div>;
  return (
    <div className="c-tarjeta">
      <form onSubmit={async (e) => { e.preventDefault(); setMsg(""); const r = await post("/api/curso/preguntas", { texto }); if (r.ok) { setTexto(""); setMsg("✓ Enviada. Es anónima."); cargar(); } else setMsg(r.error); }}>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={200} rows={2} placeholder="Escribe tu pregunta (anónima)" aria-label="Tu pregunta" />
        <button className="c-btn" style={{ marginTop: 10 }} disabled={texto.trim().length < 4}>Enviar pregunta</button>
      </form>
      {msg && <p className="c-ok">{msg}</p>}
      {lista.length > 0 && (
        <div>
          <span className="c-eyebrow">Vota las que también quieres escuchar</span>
          {lista.map((p) => {
            const mia = votadas.includes(p.id);
            return (
              <div className={`c-pregunta${p.respondida ? " respondida" : ""}`} key={p.id}>
                <span>{p.texto}{p.respondida && " · respondida"}</span>
                <button className="c-voto" aria-pressed={mia} disabled={mia} aria-label={`Votar. ${p.votos} votos`}
                  onClick={async () => { setVotadas((v) => [...v, p.id]); setLista((l) => l.map((x) => (x.id === p.id ? { ...x, votos: x.votos + 1 } : x))); await post(`/api/curso/preguntas/${p.id}/voto`, {}); }}>
                  👍 {p.votos}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Evaluacion({ contenido, llave, enVivo }: { contenido: Contenido; llave: string; enVivo: boolean }) {
  const [enviada, setEnviada] = useGuardado<boolean>(`curso_eval:${llave}`, false);
  const [utilidad, setUtilidad] = useState(0);
  const [valioso, setValioso] = useState("");
  const [interes, setInteres] = useState("");
  const [error, setError] = useState("");
  if (!enVivo) return null;
  if (enviada) return <div className="c-tarjeta"><p>🙌 <b>Gracias por tu opinión.</b></p><button className="c-btn borde chico" onClick={() => setEnviada(false)}>Cambiar mi respuesta</button></div>;
  return (
    <form className="c-tarjeta" onSubmit={async (e) => { e.preventDefault(); const r = await post("/api/curso/evaluacion", { utilidad, valioso, interes }); if (r.ok) setEnviada(true); else setError(r.error); }}>
      <h3>¿Qué tan útil te pareció?</h3>
      <div className="c-estrellas">{[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} aria-pressed={utilidad === n} onClick={() => setUtilidad(n)}>{n}</button>)}</div>
      <p className="c-nota" style={{ display: "flex", justifyContent: "space-between" }}><span>Poco</span><span>Mucho</span></p>
      <h3>¿Qué fue lo más valioso?</h3>
      <textarea value={valioso} onChange={(e) => setValioso(e.target.value)} maxLength={300} rows={2} placeholder="Opcional" aria-label="Lo más valioso" />
      <h3>¿Te gustaría otra sesión sobre…?</h3>
      <div className="c-chips">{contenido.evaluacion.intereses.map((o) => <button type="button" key={o} className="c-chip" aria-pressed={interes === o} onClick={() => setInteres(interes === o ? "" : o)}>{o}</button>)}</div>
      {error && <p className="c-error">{error}</p>}
      <button className="c-btn" disabled={!utilidad}>Enviar</button>
    </form>
  );
}

export default function MeLlevo({ contenido, llave, enVivo, visible, material, alCopiar }: Props) {
  return (
    <>
      <h1>Me llevo</h1>
      <p className="c-sub">Todo lo del curso, para después.</p>

      <section id="ml-semaforo"><h2>El semáforo</h2><Semaforo contenido={contenido} llave={llave} /></section>

      <section id="ml-entrenamiento">
        <h2>Desactiva el entrenamiento</h2>
        <p className="c-nota" style={{ marginBottom: 12 }}>Así lo que escribes no se usa para entrenar a la IA. Hazlo una vez en cada app.</p>
        {contenido.entrenamiento.apps.map((a) => (
          <details className="c-tarjeta" key={a.app}>
            <summary>{a.app}</summary>
            <ol className="c-pasos">{a.pasos.map((p) => <li key={p}>{p}</li>)}</ol>
          </details>
        ))}
        <p className="c-nota">Los menús cambian seguido. Revisado: {contenido.entrenamiento.verificado}.</p>
      </section>

      <section id="ml-reto"><h2>Tu reto de 7 días</h2><Reto contenido={contenido} alCopiar={alCopiar} /></section>

      <section id="ml-material">
        <h2>Material</h2>
        {contenido.material.map((m) => {
          const href = material[m.id] ? m.archivo : m.pagina;
          return (
            <div className="c-tarjeta" key={m.id}>
              <h3>{m.titulo}</h3>
              <p className="c-nota">{m.descripcion}</p>
              {href ? <a className="c-btn sec" href={href} {...(material[m.id] ? { download: true } : {})}>{material[m.id] ? "Descargar PDF" : "Abrir"}</a> : <p className="c-etiqueta">Disponible el día del curso</p>}
            </div>
          );
        })}
      </section>

      <section id="ml-preguntas"><h2>Preguntas para la sala</h2><Preguntas enVivo={enVivo} visible={visible} /></section>

      {enVivo && <section id="ml-evaluacion"><h2>Tu opinión</h2><Evaluacion contenido={contenido} llave={llave} enVivo={enVivo} /></section>}
    </>
  );
}
