"use client";
import { useEffect, useRef, useState } from "react";
import FormReserva from "@/components/FormReserva";
import { BAHIAS, HORARIO, hhmm, pesos, servicioDe } from "@/lib/agenda-catalogo";

interface Estado {
  ahora: { fecha: string; min: number };
  cierre: number | null;
  dias: { fecha: string; etiqueta: string }[];
  fecha: string;
  reservas: { id: string; folio: number | null; bahia: number; inicioMin: number; finMin: number; servicioId: number; servicio: string; cliente: string; origen: string }[];
  ultima: { id: string; fecha: string } | null;
}

const INICIO = HORARIO.abre;
const RANGO = HORARIO.cierra - HORARIO.abre;
const pct = (min: number) => `${((min - INICIO) / RANGO) * 100}%`;
const ancho = (min: number) => `${(min / RANGO) * 100}%`;
const HORAS = Array.from({ length: RANGO / 60 + 1 }, (_, i) => INICIO + i * 60);

export default function Agenda() {
  const [fecha, setFecha] = useState("");
  const [e, setE] = useState<Estado | null>(null);
  const [nueva, setNueva] = useState("");
  const ultimaVista = useRef<string | null | undefined>(undefined);
  const fechaRef = useRef("");
  fechaRef.current = fecha;

  async function cargar() {
    try {
      const r = await fetch(`/api/agenda/estado${fechaRef.current ? `?fecha=${fechaRef.current}` : ""}`, { cache: "no-store" });
      if (!r.ok) return;
      const j: Estado = await r.json();
      // Llegó una reserva nueva (de aquí o de un celular): la agenda salta a ese día y la resalta.
      const id = j.ultima?.id ?? null;
      if (ultimaVista.current !== undefined && id && id !== ultimaVista.current && j.ultima!.fecha !== j.fecha) {
        ultimaVista.current = id;
        setNueva(id);
        setFecha(j.ultima!.fecha);
        return;
      }
      if (ultimaVista.current !== undefined && id && id !== ultimaVista.current) setNueva(id);
      ultimaVista.current = id;
      setE(j);
      if (!fechaRef.current) setFecha(j.fecha);
    } catch {}
  }
  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 1500);
    return () => clearInterval(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (fecha) cargar();
  }, [fecha]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!nueva) return;
    const t = setTimeout(() => setNueva(""), 8000);
    return () => clearTimeout(t);
  }, [nueva]);

  const del = e && e.fecha === fecha ? e : null;
  const reservas = del?.reservas ?? [];
  const cierre = del?.cierre ?? HORARIO.cierra;
  const esHoy = !!del && del.ahora.fecha === del.fecha;
  const horasOcupadas = reservas.reduce((a, r) => a + r.finMin - r.inicioMin, 0) / 60;
  const capacidad = (BAHIAS.length * (cierre - HORARIO.abre)) / 60;
  const ingreso = reservas.reduce((a, r) => a + (servicioDe(r.servicioId)?.precio ?? 0), 0);
  const enVivo = reservas.filter((r) => r.origen === "vivo").length;

  return (
    <div className="agenda-grid">
      <section className="panel">
        <header className="panel-cab">
          <span className="panel-icono ico-form"><Icono tipo="form" /></span>
          <div style={{ minWidth: 0 }}>
            <div className="panel-app"><span className="gris">1 ·</span> Reservar</div>
            <div className="panel-contexto">Lo llena el cliente o recepción</div>
          </div>
        </header>
        <div className="panel-cuerpo">
          <FormReserva compacto onFecha={setFecha} />
        </div>
      </section>

      <div className="conector" aria-hidden>
        <span className="conector-flecha">→</span>
        <span className="conector-texto">se agenda sin encimar</span>
      </div>

      <section className="panel">
        <header className="panel-cab agenda-cab">
          <span className="panel-icono ico-hoja"><Icono tipo="agenda" /></span>
          <div style={{ minWidth: 0 }}>
            <div className="panel-app"><span className="gris">2 ·</span> Agenda del taller</div>
            <div className="panel-contexto">{BAHIAS.length} bahías · {HORARIO.colchon} min libres entre servicios</div>
          </div>
          <div className="chips agenda-dias">
            {e?.dias.map((d) => (
              <button key={d.fecha} className="chip" aria-pressed={fecha === d.fecha} onClick={() => setFecha(d.fecha)}>{d.etiqueta.replace(/ de \S+$/, "")}</button>
            ))}
          </div>
        </header>
        <div className="panel-cuerpo agenda-cuerpo">
          <div className="agenda-kpis">
            <div><span className="gris">Servicios</span><b>{reservas.length}</b></div>
            <div><span className="gris">Ocupación</span><b>{Math.round((horasOcupadas / capacidad) * 100)}%</b></div>
            <div><span className="gris">Ingreso estimado</span><b>{pesos(ingreso)}</b></div>
            <div><span className="gris">Reservados en vivo</span><b className="azul">{enVivo}</b></div>
          </div>
          <div className="linea-scroll">
            <div className="linea">
              <div className="linea-horas">
                {HORAS.map((h) => <span key={h} style={{ left: pct(h) }}>{hhmm(h).replace(":00", "")}</span>)}
              </div>
              {BAHIAS.map((b) => (
                <div key={b} className="linea-fila">
                  <div className="linea-bahia">Bahía {b}</div>
                  <div className="linea-pista">
                    {HORAS.slice(1, -1).map((h) => <i key={h} className="linea-guia" style={{ left: pct(h) }} />)}
                    {esHoy && <div className="linea-pasado" style={{ width: pct(Math.min(Math.max(del!.ahora.min, INICIO), HORARIO.cierra)) }} />}
                    {cierre < HORARIO.cierra && <div className="linea-cerrado" style={{ left: pct(cierre), right: 0 }}><span>Cerrado</span></div>}
                    {reservas.filter((r) => r.bahia === b).map((r) => (
                      <div key={r.id}>
                        <div className={`cita ${r.origen === "vivo" ? "vivo" : ""} ${nueva === r.id ? "nuevo" : ""}`} style={{ left: pct(r.inicioMin), width: ancho(r.finMin - r.inicioMin) }} title={`${hhmm(r.inicioMin)}–${hhmm(r.finMin)} · ${r.servicio} · ${r.cliente}`}>
                          <span className="cita-hora">{hhmm(r.inicioMin)}{r.folio ? ` · #${r.folio}` : ""}</span>
                          <span className="cita-servicio">{r.servicio}</span>
                          <span className="cita-cliente">{r.cliente}</span>
                        </div>
                        <div className="colchon" style={{ left: pct(r.finMin), width: ancho(Math.min(HORARIO.colchon, cierre - r.finMin)) }} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {esHoy && del!.ahora.min > INICIO && del!.ahora.min < HORARIO.cierra && (
                <div className="linea-ahora" style={{ left: `calc(var(--bahia-ancho) + (100% - var(--bahia-ancho)) * ${(del!.ahora.min - INICIO) / RANGO})` }}><span>Ahora</span></div>
              )}
            </div>
          </div>
          <div className="agenda-leyenda gris">
            <span><i className="ley cita-ley" /> Reservado</span>
            <span><i className="ley vivo-ley" /> Reservado en vivo</span>
            <span><i className="ley colchon-ley" /> Preparación entre servicios</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function Icono({ tipo }: { tipo: "form" | "agenda" }) {
  const p = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (tipo === "form") return <svg {...p}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>;
  return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>;
}
