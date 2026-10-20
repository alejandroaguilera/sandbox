"use client";
import { useEffect, useState } from "react";
import { dispositivo } from "@/lib/dispositivo";
import { CLIENTES_AGENDA, SERVICIOS, hhmm, pesos, servicioDe } from "@/lib/agenda-catalogo";

export interface Reservada { id: string; folio: number; fecha: string; dia: string; inicio: string; fin: string; bahia: number; servicio: string; cliente: string }

const duracion = (min: number) => (min % 60 ? `${Math.floor(min / 60)} h ${min % 60} min`.replace(/^0 h /, "") : `${min / 60} h`);

export default function FormReserva({ compacto = false, onFecha, onReservado }: { compacto?: boolean; onFecha?: (f: string) => void; onReservado?: (r: Reservada) => void }) {
  const [dias, setDias] = useState<{ fecha: string; etiqueta: string }[]>([]);
  const [servicioId, setServicioId] = useState(0);
  const [fecha, setFecha] = useState("");
  const [horas, setHoras] = useState<{ min: number; libre: boolean }[] | null>(null);
  const [inicio, setInicio] = useState<number | null>(null);
  const [cliente, setCliente] = useState("");
  const [nombre, setNombre] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [hecha, setHecha] = useState<Reservada | null>(null);

  useEffect(() => {
    fetch("/api/agenda/estado", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        setDias(j.dias);
        setFecha(j.dias[0]?.fecha ?? "");
      })
      .catch(() => setError("No se pudo cargar la agenda"));
  }, []);

  useEffect(() => {
    if (fecha) onFecha?.(fecha);
  }, [fecha]); // eslint-disable-line react-hooks/exhaustive-deps

  // Disponibilidad en vivo: se refresca sola por si alguien más aparta un horario.
  useEffect(() => {
    if (!servicioId || !fecha) return setHoras(null);
    let vivo = true;
    const cargar = () =>
      fetch(`/api/agenda/disponibilidad?fecha=${fecha}&servicio=${servicioId}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => vivo && setHoras(j.horarios))
        .catch(() => {});
    cargar();
    const t = setInterval(cargar, 4000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [servicioId, fecha]);

  // Si el horario elegido se ocupó mientras tanto, se suelta.
  useEffect(() => {
    if (inicio !== null && horas && !horas.find((h) => h.min === inicio)?.libre) setInicio(null);
  }, [horas, inicio]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!servicioId || !fecha || inicio === null) return setError("Elige servicio, día y horario.");
    if (!cliente || (cliente === "otro" && !nombre.trim())) return setError("Elige o escribe el cliente.");
    setEnviando(true);
    try {
      const r = await fetch("/api/agenda/reservar", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...dispositivo() },
        body: JSON.stringify({ servicioId, fecha, inicioMin: inicio, clienteId: cliente === "otro" ? null : Number(cliente), nombre: cliente === "otro" ? nombre : null }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "No se pudo reservar");
      setHecha(j.reserva);
      onReservado?.(j.reserva);
    } catch (err) {
      setError((err as Error).message);
      setInicio(null);
    } finally {
      setEnviando(false);
    }
  }

  function otra() {
    setHecha(null);
    setInicio(null);
    setCliente("");
    setNombre("");
  }

  if (hecha) {
    return (
      <div className="reserva-ok entra">
        <span className="reserva-ok-check">✓</span>
        <b className="reserva-ok-titulo">Reservado · Folio {hecha.folio}</b>
        <div className="reserva-ok-detalle">
          <div>{hecha.servicio}</div>
          <div className="gris">{hecha.dia}, {hecha.inicio}–{hecha.fin} · Bahía {hecha.bahia}</div>
          <div className="gris">{hecha.cliente}</div>
        </div>
        <button className="boton secundario bloque" onClick={otra}>Agendar otro servicio</button>
      </div>
    );
  }

  const s = servicioDe(servicioId);
  const libres = horas?.filter((h) => h.libre).length ?? 0;
  return (
    <form onSubmit={enviar} noValidate className={compacto ? "form-reserva compacto" : "form-reserva"}>
      <div className="campo">
        <label>1. Servicio</label>
        {compacto ? (
          <select value={servicioId || ""} onChange={(e) => { setServicioId(Number(e.target.value)); setInicio(null); }}>
            <option value="" disabled>Elige un servicio…</option>
            {SERVICIOS.map((x) => <option key={x.id} value={x.id}>{x.nombre} · {duracion(x.min)}</option>)}
          </select>
        ) : (
          <div className="opciones">
            {SERVICIOS.map((x) => (
              <button type="button" key={x.id} className="opcion" aria-pressed={servicioId === x.id} onClick={() => { setServicioId(x.id); setInicio(null); }}>
                <b>{x.nombre}</b>
                <span>{duracion(x.min)} · {pesos(x.precio)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="campo">
        <label>2. Día</label>
        <div className="chips">
          {dias.map((d) => (
            <button type="button" key={d.fecha} className="chip" aria-pressed={fecha === d.fecha} onClick={() => { setFecha(d.fecha); setInicio(null); }}>
              {d.etiqueta}
            </button>
          ))}
        </div>
      </div>

      <div className="campo">
        <label>
          3. Horario {s && horas && <span className="gris horas-cuenta">· {libres ? `${libres} libres` : "sin lugares este día"}</span>}
        </label>
        {!s ? (
          <small>Elige un servicio para ver los horarios libres.</small>
        ) : !horas ? (
          <small className="pulso">Revisando disponibilidad…</small>
        ) : (
          <div className="horas">
            {horas.map((h) => (
              <button type="button" key={h.min} className="hora" disabled={!h.libre} aria-pressed={inicio === h.min} onClick={() => setInicio(h.min)}>
                {hhmm(h.min)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="campo">
        <label>4. Cliente</label>
        <select value={cliente} onChange={(e) => setCliente(e.target.value)}>
          <option value="" disabled>Elige un cliente…</option>
          {CLIENTES_AGENDA.map((c) => <option key={c.id} value={c.id}>{c.nombre} · {c.vehiculo}</option>)}
          <option value="otro">Otro: escribir nombre</option>
        </select>
        {cliente === "otro" && <input placeholder="Nombre del cliente" maxLength={60} value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />}
      </div>

      {error && <p className="error">{error}</p>}
      <button className="boton bloque" disabled={enviando}>
        {enviando ? "Reservando…" : s && inicio !== null ? `Reservar ${hhmm(inicio)}–${hhmm(inicio + s.min)}` : "Reservar"}
      </button>
    </form>
  );
}
