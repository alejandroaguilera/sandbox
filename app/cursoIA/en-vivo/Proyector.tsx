"use client";
import { useEffect, useState } from "react";
import type { Contenido } from "@/lib/curso/contenido";
import { useEstado } from "../util";

interface Fila { id?: string; etiqueta: string; n: number; total: number; color?: string }
interface Res {
  tipo: string; clave?: string; abierta?: boolean; participantes?: number; filas?: Fila[]; textos?: string[];
  tarjetas?: { id: string; caso: string; respuesta: string; aciertos: number; total: number }[]; jugadores?: number;
  top?: { id: string; texto: string; votos: number }[]; total?: number;
}
const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);
const COLOR: Record<string, string> = { verde: "var(--verde)", amarillo: "var(--ambar)", rojo: "var(--rojo)" };

function Barra({ etiqueta, valor, clase = "", chica }: { etiqueta: string; valor: number; clase?: string; chica?: boolean }) {
  return (
    <div className={`c-barra ${clase}${chica ? " chica" : ""}`}>
      <div className="c-barra-cab"><span>{etiqueta}</span><b>{valor}%</b></div>
      <div className="c-barra-pista"><div style={{ width: `${valor}%` }} /></div>
    </div>
  );
}

/** Una sola pantalla (1920×1080) que cambia según lo que el control manda al proyector. */
export default function Proyector({ contenido, qr, url }: { contenido: Contenido; qr: string; url: string }) {
  const { estado, sinRed } = useEstado("pantalla");
  const s = estado?.sesion ?? null;
  const vista = s?.proyector ?? "qr";
  const consulta = vista.startsWith("v:") ? vista.slice(2) : vista === "qr" ? "" : vista;
  const [res, setRes] = useState<Res | null>(null);
  const [giro, setGiro] = useState(0);

  useEffect(() => {
    setRes(null);
    if (!consulta) return;
    let vivo = true;
    const cargar = async () => {
      try {
        const r = await fetch(`/api/curso/resultados?v=${consulta}`, { cache: "no-store" });
        if (r.ok && vivo) setRes(await r.json());
      } catch {}
    };
    cargar();
    const t = setInterval(cargar, 3000);
    return () => { vivo = false; clearInterval(t); };
  }, [consulta, s?.epoca]);
  useEffect(() => { const t = setInterval(() => setGiro((g) => g + 1), 5000); return () => clearInterval(t); }, []);

  const def = contenido.votaciones.find((v) => v.id === consulta);
  const [dominio, ...ruta] = url.split("/");
  const cabecera = (titulo: string, sub?: string) => (
    <div className="c-proy-cab">
      <div><h1>{titulo}</h1>{sub && <p className="c-proy-sub">{sub}</p>}</div>
      <div className="c-proy-url">Participa en<b>{url}</b><span className="n">{estado?.conectados ?? 0}</span> conectados</div>
    </div>
  );

  let cuerpo: React.ReactNode;
  if (!consulta || !s) {
    cuerpo = (
      <div className="c-proy-cuerpo">
        <div className="c-proy-qr">
          <div className="qr" dangerouslySetInnerHTML={{ __html: qr }} />
          <div>
            <p className="c-eyebrow" style={{ fontSize: 26, color: "var(--azul)" }}>Escanea con la cámara de tu celular</p>
            <p className="url">{dominio}<span>/{ruta.join("/")}</span></p>
            <p className="c-proy-conectados">{s ? <><b>{estado?.conectados ?? 0}</b> {estado?.conectados === 1 ? "persona conectada" : "personas conectadas"}</> : estado ? "En un momento empezamos." : ""}</p>
          </div>
        </div>
      </div>
    );
  } else if (def && res && res.tipo === def.tipo) {
    const filas = res.filas ?? [];
    const n = res.participantes ?? 0;
    const sub = `${n} ${n === 1 ? "respuesta" : "respuestas"}${res.abierta ? " · votación abierta" : ""}`;
    if (def.tipo === "sino") {
      cuerpo = <>{cabecera(def.titulo, sub)}<div className="c-proy-cuerpo">{filas.map((f) => <Barra key={f.id} etiqueta={f.etiqueta} valor={pct(f.n, f.total)} clase={f.color === "amarillo" ? "amarillo" : ""} />)}{!res.abierta && def.remate && <p className="c-remate">{def.remate}</p>}</div></>;
    } else if (def.tipo === "unica") {
      const max = Math.max(0, ...filas.map((f) => f.n));
      cuerpo = <>{cabecera(def.titulo, sub)}<div className="c-proy-cuerpo">{filas.map((f) => <Barra key={f.id} etiqueta={f.etiqueta} valor={pct(f.n, f.total)} clase={f.n > 0 && f.n === max ? "azul" : ""} />)}</div></>;
    } else if (def.tipo === "palabra") {
      const max = Math.max(1, ...filas.map((f) => f.n));
      const nube = (
        <div className="c-nube">
          {filas.length ? filas.map((f, i) => <span key={f.etiqueta} style={{ fontSize: `${(0.9 + 2.4 * (f.n / max)).toFixed(2)}em`, color: i === 0 ? "var(--azul)" : f.n / max > 0.3 ? "var(--texto)" : "var(--gris)" }}>{f.etiqueta}</span>) : <span className="gris">Escribe tu palabra…</span>}
        </div>
      );
      const igual = filas[0] && def.ia?.[0] && filas[0].etiqueta.normalize("NFD").replace(/[̀-ͯ]/g, "") === def.ia[0].palabra.normalize("NFD").replace(/[̀-ͯ]/g, "");
      cuerpo = (
        <>
          {cabecera(def.titulo, sub)}
          <div className="c-proy-cuerpo">
            <p className="c-frase">{def.frase}</p>
            {res.abierta ? nube : (
              <>
                <div className="c-dos">
                  <div><p className="c-eyebrow" style={{ fontSize: 22, marginBottom: 14 }}>La sala</p>{nube}</div>
                  <div><p className="c-eyebrow" style={{ fontSize: 22, marginBottom: 14 }}>La IA</p>{def.ia!.map((x, i) => <Barra key={x.palabra} etiqueta={x.palabra} valor={x.pct} clase={i === 0 ? "azul" : ""} chica />)}<p className="gris" style={{ fontSize: 18 }}>Porcentajes ilustrativos.</p></div>
                </div>
                {filas[0] && <p className="c-remate">{igual ? def.remate : `La sala dijo “${filas[0].etiqueta}”. La IA apostó por “${def.ia![0].palabra}”.`}</p>}
              </>
            )}
          </div>
        </>
      );
    } else {
      const textos = res.textos ?? [];
      cuerpo = <>{cabecera(def.titulo, sub)}<div className="c-proy-cuerpo"><div className="c-carrusel">{textos.length ? <span key={giro} className="entra">“{textos[giro % textos.length]}”</span> : <span className="gris">Cuéntanos desde tu celular…</span>}</div></div></>;
    }
  } else if (consulta === "semaforo" && res?.tarjetas) {
    const con = res.tarjetas.filter((t) => t.total > 0);
    const peor = con.length ? con.reduce((a, b) => (pct(b.aciertos, b.total) < pct(a.aciertos, a.total) ? b : a)) : null;
    cuerpo = (
      <>
        {cabecera("El semáforo", `${res.jugadores ?? 0} ${res.jugadores === 1 ? "persona jugó" : "personas jugaron"} · % de aciertos por caso`)}
        <div className="c-proy-cuerpo">
          {res.tarjetas.map((t) => (
            <div key={t.id} className={`c-sem-fila${peor?.id === t.id && pct(t.aciertos, t.total) < 100 ? " peor" : ""}`}>
              <i style={{ background: COLOR[t.respuesta] }} />
              <span>{t.caso}</span>
              <div className="c-barra-pista" style={{ height: 20 }}><div style={{ width: `${pct(t.aciertos, t.total)}%`, background: peor?.id === t.id && pct(t.aciertos, t.total) < 100 ? "var(--rojo)" : "#48484a" }} /></div>
              <b>{t.total ? `${pct(t.aciertos, t.total)}%` : "–"}</b>
            </div>
          ))}
        </div>
      </>
    );
  } else if (consulta === "preguntas" && res?.top) {
    cuerpo = (
      <>
        {cabecera("¿Preguntas?", `${res.total ?? 0} recibidas · las más votadas`)}
        <div className="c-proy-cuerpo">
          {res.top.length ? res.top.map((p) => <div className="c-proy-pregunta" key={p.id}><b>👍 {p.votos}</b><span>{p.texto}</span></div>) : <div className="c-carrusel"><span className="gris">Escribe tu pregunta en “Me llevo”. Es anónima.</span></div>}
        </div>
      </>
    );
  } else {
    cuerpo = <div className="c-proy-cuerpo"><p className="gris pulso" style={{ textAlign: "center" }}>Cargando…</p></div>;
  }

  return (
    <div className="c-proy">
      {cuerpo}
      <div className="c-proy-pie"><span>MrHapps · Curso IA desde cero{s ? ` · ${s.cliente}` : ""}</span><span>{sinRed ? <span className="rojo">Reconectando…</span> : contenido.curso}</span></div>
    </div>
  );
}
