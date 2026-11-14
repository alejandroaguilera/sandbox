"use client";
import { useCallback, useEffect, useState } from "react";
import type { Contenido } from "@/lib/curso/contenido";
import { ETIQUETA_TIPO } from "../util";

interface Sesion { id: string; codigo: string; cliente: string; fecha: string; wifi: string | null; activa: boolean; momentoId: string | null; iaPausada: boolean; sinIA: boolean; proyector: string }
interface Datos {
  sesiones: Sesion[]; activa: Sesion | null; modelo: string; maxMensajes: number; tope: number; iaLista: boolean;
  gasto: { mensajes: number; usd: number };
  conectados?: number;
  votaciones?: { clave: string; abierta: boolean; participantes: number }[];
  uso?: { dispositivos: number; mensajes: number; usd: number };
  preguntas?: { id: string; texto: string; votos: number; oculta: boolean; respondida: boolean }[];
  semaforo?: number;
  evaluacion?: { n: number; promedio: number | null };
}
const usd = (n: number) => `$${n.toFixed(n < 1 ? 3 : 2)}`;
const paraInput = (iso: string) => { const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); };

export default function Control({ contenido }: { contenido: Contenido }) {
  const [d, setD] = useState<Datos | null>(null);
  const [msg, setMsg] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [form, setForm] = useState({ codigo: "", cliente: "", fecha: "", wifi: "" });
  const [verMomentos, setVerMomentos] = useState(false);

  const cargar = useCallback(async () => {
    if (document.hidden) return;
    try {
      const r = await fetch("/api/curso/control", { cache: "no-store" });
      if (r.status === 401) { window.location.href = "/cursoIA/control/login"; return; }
      if (r.ok) setD(await r.json());
    } catch {}
  }, []);
  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 3000);
    document.addEventListener("visibilitychange", cargar);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", cargar); };
  }, [cargar]);

  async function accion(body: Record<string, unknown>, confirmar?: string) {
    if (confirmar && !window.confirm(confirmar)) return false;
    setOcupado(true);
    setMsg("");
    try {
      const r = await fetch("/api/curso/control", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setMsg(j.error || "No se pudo");
      await cargar();
      return r.ok;
    } catch {
      setMsg("Sin conexión");
      return false;
    } finally {
      setOcupado(false);
    }
  }

  if (!d) return <div className="c-app c-control"><p className="c-nota pulso">Cargando…</p></div>;
  const s = d.activa;
  const momentos = contenido.momentos;
  const idx = s?.momentoId ? momentos.findIndex((m) => m.id === s.momentoId) : -1;
  const actual = idx >= 0 ? momentos[idx] : null;
  const vot = (clave: string) => d.votaciones?.find((v) => v.clave === clave);
  const titulo = (clave: string) => contenido.votaciones.find((v) => v.id === clave)?.titulo ?? clave;
  const votAhora = actual?.accion?.tipo === "votacion" ? actual.accion.votacionId : null;
  const proyAhora = actual?.accion?.tipo === "semaforo" ? "semaforo" : actual?.accion?.tipo === "mellevo" && actual.accion.seccion === "preguntas" ? "preguntas" : null;
  const VISTAS: [string, string][] = [["qr", "QR"], ...contenido.votaciones.map((v) => [`v:${v.id}`, v.titulo] as [string, string]), ["semaforo", "Semáforo"], ["preguntas", "Preguntas"]];

  return (
    <div className="c-app c-control">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <span className="c-eyebrow">Control · Curso IA</span>
        <button className="c-chip" style={{ minHeight: 34, padding: "5px 12px", fontSize: 13 }} onClick={async () => { await fetch("/api/admin/logout", { method: "POST" }); window.location.href = "/cursoIA/control/login"; }}>Salir</button>
      </div>
      <h1 style={{ marginTop: 4 }}>{s ? s.cliente : "Sin sesión activa"}</h1>
      {s && <p className="c-sub">{s.codigo} · {new Date(s.fecha).toLocaleString("es-MX", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>}
      {msg && <p className="c-error" style={{ marginTop: 8 }}>{msg}</p>}
      {!d.iaLista && <p className="c-error" style={{ marginTop: 8 }}>Falta ANTHROPIC_API_KEY: el asistente no va a responder.</p>}

      {s && (
        <>
          <div className="c-kpis" style={{ marginTop: 16 }}>
            <div><b>{d.conectados ?? 0}</b><span>conectados</span></div>
            <div><b>{d.uso?.mensajes ?? 0}</b><span>mensajes IA</span></div>
            <div><b>{usd(d.gasto.usd)}</b><span>hoy de {usd(d.tope)}</span></div>
            <div><b>{d.preguntas?.filter((p) => !p.oculta).length ?? 0}</b><span>preguntas</span></div>
          </div>

          <h2>Ahora</h2>
          <div className="c-tarjeta c-ahora">
            {actual ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <span className={`c-insignia ${actual.tipo}`}>{ETIQUETA_TIPO[actual.tipo]}</span>
                  <span className="c-eyebrow">Lámina {actual.lamina} · {idx + 1} de {momentos.length}</span>
                </div>
                <h3 style={{ fontSize: 22 }}>{actual.titulo}</h3>
              </>
            ) : (
              <h3 style={{ fontSize: 22 }}>Aún no empieza <span className="gris" style={{ fontWeight: 400 }}>(los celulares ven la hora y el Wi-Fi)</span></h3>
            )}
            <div className="c-fila">
              <button className="c-btn sec c-grande" disabled={ocupado || idx < 0} onClick={() => accion({ accion: "momento", id: idx > 0 ? momentos[idx - 1].id : null })}>← Anterior</button>
              <button className="c-btn c-grande" disabled={ocupado || idx >= momentos.length - 1} onClick={() => accion({ accion: "momento", id: momentos[idx + 1].id })}>{idx < 0 ? "Empezar →" : "Siguiente →"}</button>
            </div>
            {idx >= 0 && idx < momentos.length - 1 && <p className="c-nota">Sigue: {momentos[idx + 1].titulo}</p>}
            {votAhora && (
              <button className={`c-btn${vot(votAhora)?.abierta ? " sec" : ""}`} disabled={ocupado} onClick={() => accion({ accion: "votacion", clave: votAhora, abierta: !vot(votAhora)?.abierta })}>
                {vot(votAhora)?.abierta ? `Cerrar votación (${vot(votAhora)?.participantes ?? 0} votos)` : "Abrir votación y proyectarla"}
              </button>
            )}
            {proyAhora && s.proyector !== proyAhora && <button className="c-btn" disabled={ocupado} onClick={() => accion({ accion: "proyector", valor: proyAhora })}>Proyectar {proyAhora === "semaforo" ? "resultados del semáforo" : "las preguntas más votadas"}</button>}
          </div>

          <button className="c-btn borde chico" onClick={() => setVerMomentos((v) => !v)}>{verMomentos ? "Ocultar" : "Ver"} todos los momentos</button>
          {verMomentos && (
            <div className="c-tarjeta" style={{ marginTop: 12 }}>
              <button className={`c-momento${idx < 0 ? " actual" : ""}`} style={{ borderTop: 0 }} disabled={ocupado} onClick={() => accion({ accion: "momento", id: null })}><span>Aún no empieza</span></button>
              {contenido.bloques.map((b) => (
                <div key={b.id}>
                  <p className="c-eyebrow" style={{ padding: "14px 4px 6px", color: "var(--azul)" }}>{b.id} · {b.nombre} · {b.hora}</p>
                  {momentos.filter((m) => m.bloque === b.id).map((m) => (
                    <button key={m.id} className={`c-momento${m.id === s.momentoId ? " actual" : ""}`} disabled={ocupado} onClick={() => accion({ accion: "momento", id: m.id })}>
                      <span>{m.titulo}<br /><small>{ETIQUETA_TIPO[m.tipo]} · lámina {m.lamina}</small></span>
                      <span>{m.id === s.momentoId ? "●" : ""}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          <h2>Votaciones</h2>
          <div className="c-tarjeta">
            {contenido.votaciones.map((v) => {
              const e = vot(v.id);
              return (
                <div className="c-vot" key={v.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                    <b>{v.titulo} <span className="gris" style={{ fontWeight: 400 }}>· lámina {v.lamina}</span></b>
                    <span className={`c-estado${e?.abierta ? " on" : ""}`}>{e?.abierta ? "Abierta" : "Cerrada"} · {e?.participantes ?? 0}</span>
                  </div>
                  <div className="c-fila">
                    <button className={`c-btn chico${e?.abierta ? " sec" : ""}`} disabled={ocupado} onClick={() => accion({ accion: "votacion", clave: v.id, abierta: !e?.abierta })}>{e?.abierta ? "Cerrar" : "Abrir"}</button>
                    <button className="c-btn sec chico" disabled={ocupado || s.proyector === `v:${v.id}`} onClick={() => accion({ accion: "proyector", valor: `v:${v.id}` })}>{s.proyector === `v:${v.id}` ? "En proyector" : "Proyectar"}</button>
                    <button className="c-btn peligro chico" disabled={ocupado} onClick={() => accion({ accion: "reiniciarVotacion", clave: v.id }, `¿Borrar los votos de “${v.titulo}”?`)}>Reiniciar</button>
                  </div>
                  {v.tipo === "palabra" && <p className="c-nota">Abierta: el proyector muestra solo la nube de la sala. Al cerrarla aparecen las barras de la IA y el remate.</p>}
                </div>
              );
            })}
          </div>

          <h2>Proyector</h2>
          <div className="c-tarjeta">
            <p className="c-nota">Mostrando: <b style={{ color: "var(--texto)" }}>{VISTAS.find(([k]) => k === s.proyector)?.[1] ?? s.proyector}</b></p>
            <div className="c-chips">
              {VISTAS.map(([k, n]) => <button key={k} className="c-chip" aria-pressed={s.proyector === k} disabled={ocupado} onClick={() => accion({ accion: "proyector", valor: k })}>{n}</button>)}
            </div>
            <a className="c-btn borde chico" href="/cursoIA/en-vivo" target="_blank" rel="noopener noreferrer">Abrir la vista de proyector ↗</a>
          </div>

          <h2>Asistente de IA</h2>
          <div className="c-tarjeta">
            <p className="c-nota">{d.uso?.mensajes ?? 0} mensajes de {d.uso?.dispositivos ?? 0} celulares en esta sesión ({usd(d.uso?.usd ?? 0)}). Hoy: {usd(d.gasto.usd)} de {usd(d.tope)}. Límite: {d.maxMensajes} por celular. Modelo: {d.modelo}.</p>
            <label className="c-interruptor" style={{ color: "var(--texto)", fontSize: 17 }}>
              <span><b>Pausar asistente de IA</b><br /><small className="gris">El chat muestra “Seguimos con la app de ChatGPT”.</small></span>
              <input type="checkbox" checked={s.iaPausada} disabled={ocupado} onChange={(e) => accion({ accion: "ia", iaPausada: e.target.checked })} />
            </label>
            <label className="c-interruptor" style={{ color: "var(--texto)", fontSize: 17 }}>
              <span><b>Modo sin IA</b><br /><small className="gris">Biblioteca y constructor quedan solo con Copiar.</small></span>
              <input type="checkbox" checked={s.sinIA} disabled={ocupado} onChange={(e) => accion({ accion: "ia", sinIA: e.target.checked })} />
            </label>
          </div>

          <h2>Preguntas de la sala</h2>
          <div className="c-tarjeta">
            {!d.preguntas?.length && <p className="c-nota">Todavía no hay preguntas.</p>}
            {d.preguntas?.map((p) => (
              <div className="c-vot" key={p.id} style={{ opacity: p.oculta || p.respondida ? 0.5 : 1 }}>
                <p><b className="azul">👍 {p.votos}</b> · {p.texto}{p.oculta && " (oculta)"}{p.respondida && " (respondida)"}</p>
                <div className="c-fila">
                  <button className="c-btn sec chico" disabled={ocupado} onClick={() => accion({ accion: "pregunta", id: p.id, respondida: !p.respondida })}>{p.respondida ? "Marcar pendiente" : "Respondida"}</button>
                  <button className="c-btn sec chico" disabled={ocupado} onClick={() => accion({ accion: "pregunta", id: p.id, oculta: !p.oculta })}>{p.oculta ? "Mostrar" : "Ocultar"}</button>
                </div>
              </div>
            ))}
          </div>

          <h2>Después del curso</h2>
          <div className="c-tarjeta">
            <p className="c-nota">Semáforo: {d.semaforo ?? 0} jugadores · Evaluaciones: {d.evaluacion?.n ?? 0}{d.evaluacion?.promedio ? ` (promedio ${d.evaluacion.promedio.toFixed(1)} de 5)` : ""}</p>
            <div className="c-fila">
              {(["votos", "preguntas", "evaluacion"] as const).map((t) => <a key={t} className="c-btn sec chico" href={`/api/curso/control/exportar?tipo=${t}`}>CSV {t === "evaluacion" ? "evaluación" : t}</a>)}
            </div>
            <button className="c-btn peligro" disabled={ocupado} onClick={() => accion({ accion: "reiniciar" }, `¿Reiniciar la sesión de ${s.cliente}? Borra votos, preguntas, semáforo, evaluaciones y el uso de IA, y regresa el curso a “aún no empieza”. No se puede deshacer.`)}>Reiniciar sesión</button>
            <button className="c-btn sec" disabled={ocupado} onClick={() => accion({ accion: "desactivar" }, "¿Desactivar la sesión? Los celulares verán “el curso no está en vivo” y el asistente de IA se apaga.")}>Desactivar sesión</button>
          </div>
        </>
      )}

      <h2>Sesiones</h2>
      <div className="c-tarjeta">
        {!d.sesiones.length && <p className="c-nota">Crea la primera sesión aquí abajo.</p>}
        {d.sesiones.map((x) => (
          <div className="c-vot" key={x.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
              <b>{x.cliente} <span className="gris" style={{ fontWeight: 400 }}>· {x.codigo}</span></b>
              <span className={`c-estado${x.activa ? " on" : ""}`}>{x.activa ? "Activa" : new Date(x.fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}</span>
            </div>
            <div className="c-fila">
              {!x.activa && <button className="c-btn chico" disabled={ocupado} onClick={() => accion({ accion: "activar", id: x.id }, `¿Activar la sesión de ${x.cliente}? ${s ? "La sesión actual se desactiva." : ""}`)}>Activar</button>}
              <button className="c-btn sec chico" onClick={() => setForm({ codigo: x.codigo, cliente: x.cliente, fecha: paraInput(x.fecha), wifi: x.wifi ?? "" })}>Editar</button>
            </div>
          </div>
        ))}
      </div>
      <form className="c-tarjeta" onSubmit={async (e) => { e.preventDefault(); if (await accion({ accion: "guardarSesion", ...form, fecha: form.fecha ? new Date(form.fecha).toISOString() : "" })) { setForm({ codigo: "", cliente: "", fecha: "", wifi: "" }); setMsg(""); } }}>
        <h3>Crear o editar una sesión</h3>
        <div className="campo" style={{ marginBottom: 12 }}><label htmlFor="f-cliente">Cliente</label><input id="f-cliente" value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} placeholder="Garza Rechy" required /></div>
        <div className="campo" style={{ marginBottom: 12 }}><label htmlFor="f-codigo">Código</label><input id="f-codigo" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="garza-rechy-2026-11" autoCapitalize="none" required /><small>Si el código ya existe, se actualiza esa sesión.</small></div>
        <div className="campo" style={{ marginBottom: 12 }}><label htmlFor="f-fecha">Fecha y hora de inicio</label><input id="f-fecha" type="datetime-local" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required /></div>
        <div className="campo" style={{ marginBottom: 12 }}><label htmlFor="f-wifi">Wi-Fi para invitados <span className="gris" style={{ fontWeight: 400 }}>(opcional)</span></label><input id="f-wifi" value={form.wifi} onChange={(e) => setForm({ ...form, wifi: e.target.value })} placeholder="Nombre de la red" /></div>
        <button className="c-btn" disabled={ocupado}>Guardar sesión</button>
      </form>
      <footer className="c-pie">MrHapps · Curso IA desde cero · <a href="/cursoIA">Vista de asistentes</a></footer>
    </div>
  );
}
