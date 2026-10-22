import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "./db";
import { mulberry32 } from "./seed";
import { tieneGroserias } from "./groserias";
import { BAHIAS, CLIENTES_AGENDA, HORARIO, SERVICIOS, etiquetaDia, hhmm, servicioDe } from "./agenda-catalogo";

// Demo 4: agenda de un taller ficticio. Todo se maneja como fecha "YYYY-MM-DD" + minutos
// desde medianoche en la hora local del negocio (Nuevo Laredo).
const TZ = "America/Matamoros";
const DIAS_RESERVABLES = 6;

export interface Ahora { fecha: string; min: number }
interface Ocupado { bahia: number; inicioMin: number; finMin: number }

export function ahoraLocal(): Ahora {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value]),
  );
  return { fecha: `${p.year}-${p.month}-${p.day}`, min: Number(p.hour) * 60 + Number(p.minute) };
}

export function sumarDias(fecha: string, n: number) {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Hora de cierre del día, o null si está cerrado (domingo). */
export function cierreDe(fecha: string) {
  const d = new Date(`${fecha}T12:00:00Z`).getUTCDay();
  if (d === 0) return null;
  return d === 6 ? HORARIO.cierraSabado : HORARIO.cierra;
}

/** Hoy (si aún queda una hora útil) y los siguientes días hábiles. */
export function diasAgenda(ahora = ahoraLocal()) {
  const dias: string[] = [];
  for (let i = 0; dias.length < DIAS_RESERVABLES && i < 14; i++) {
    const f = sumarDias(ahora.fecha, i);
    const cierre = cierreDe(f);
    if (!cierre || (i === 0 && ahora.min + 30 > cierre - 60)) continue;
    dias.push(f);
  }
  return dias;
}

/** Primera bahía donde cabe el servicio respetando el colchón entre servicios. */
export function bahiaLibre(ocupadas: Ocupado[], inicio: number, fin: number) {
  for (const b of BAHIAS) {
    const choca = ocupadas.some((r) => r.bahia === b && inicio < r.finMin + HORARIO.colchon && fin + HORARIO.colchon > r.inicioMin);
    if (!choca) return b;
  }
  return null;
}

/** Horarios de inicio que aún no pasan; libre = hay al menos una bahía disponible. */
export function horarios(fecha: string, duracion: number, ocupadas: Ocupado[], ahora = ahoraLocal()) {
  const cierre = cierreDe(fecha);
  if (!cierre) return [];
  const minimo = fecha === ahora.fecha ? ahora.min + 30 : 0;
  const lista: { min: number; libre: boolean }[] = [];
  for (let m = HORARIO.abre; m + duracion <= cierre; m += HORARIO.paso) {
    if (m < minimo) continue;
    lista.push({ min: m, libre: bahiaLibre(ocupadas, m, m + duracion) !== null });
  }
  return lista;
}

// ---------- Reservas de ejemplo (para que la agenda no arranque vacía) ----------

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function generarEjemplos(fecha: string) {
  const cierre = cierreDe(fecha);
  if (!cierre) return [];
  const filas = [];
  for (const b of BAHIAS) {
    const rnd = mulberry32(hash(`${fecha}#${b}`));
    let t = HORARIO.abre + Math.floor(rnd() * 3) * HORARIO.paso;
    let k = 0;
    while (true) {
      const s = SERVICIOS[Math.floor(rnd() * SERVICIOS.length)];
      if (t + s.min > cierre) break;
      if (rnd() < 0.55) {
        const c = CLIENTES_AGENDA[Math.floor(rnd() * CLIENTES_AGENDA.length)];
        filas.push({ id: `ej-${fecha}-${b}-${k++}`, fecha, inicioMin: t, finMin: t + s.min, bahia: b, servicioId: s.id, clienteNombre: c.nombre, vehiculo: c.vehiculo, origen: "ejemplo" });
        t += s.min + HORARIO.colchon + Math.floor(rnd() * 2) * HORARIO.paso;
      } else {
        t += HORARIO.paso * (1 + Math.floor(rnd() * 3));
      }
    }
  }
  return filas;
}

// Determinístico (ids fijos + skipDuplicates): seguro de llamar en cada request.
const listas = new Set<string>();
async function asegurarEjemplos(fechas: string[]) {
  const faltan = fechas.filter((f) => !listas.has(f));
  if (!faltan.length) return;
  const vivas = await prisma.reserva.findMany({ where: { fecha: { in: faltan }, origen: "vivo" }, select: { fecha: true, bahia: true, inicioMin: true, finMin: true } });
  // Nunca encimar un ejemplo sobre una reserva real.
  const data = faltan
    .flatMap(generarEjemplos)
    .filter((e) => bahiaLibre(vivas.filter((v) => v.fecha === e.fecha && v.bahia === e.bahia), e.inicioMin, e.finMin) !== null);
  await prisma.reserva.createMany({ data, skipDuplicates: true });
  faltan.forEach((f) => listas.add(f));
}

// ---------- Lectura ----------

export async function reservasDe(fecha: string) {
  const rs = await prisma.reserva.findMany({ where: { fecha }, orderBy: [{ inicioMin: "asc" }, { bahia: "asc" }] });
  return rs.map((r) => ({
    id: r.id,
    folio: r.folio,
    bahia: r.bahia,
    inicioMin: r.inicioMin,
    finMin: r.finMin,
    servicioId: r.servicioId,
    servicio: servicioDe(r.servicioId)?.nombre ?? "Servicio",
    cliente: r.clienteNombre,
    vehiculo: r.vehiculo,
    origen: r.origen,
  }));
}

export async function estadoAgenda(fechaPedida?: string | null) {
  const ahora = ahoraLocal();
  const dias = diasAgenda(ahora);
  const fecha = fechaPedida && dias.includes(fechaPedida) ? fechaPedida : dias[0];
  await asegurarEjemplos(dias);
  const [reservas, ultima] = await Promise.all([
    reservasDe(fecha),
    prisma.reserva.findFirst({ where: { origen: "vivo" }, orderBy: { createdAt: "desc" }, select: { id: true, fecha: true } }),
  ]);
  return { ahora, cierre: cierreDe(fecha), dias: dias.map((f) => ({ fecha: f, etiqueta: etiquetaDia(f) })), fecha, reservas, ultima };
}

export async function disponibilidad(fecha: string, servicioId: number) {
  const s = servicioDe(servicioId);
  const ahora = ahoraLocal();
  if (!s || !diasAgenda(ahora).includes(fecha)) return [];
  await asegurarEjemplos([fecha]);
  const ocupadas = await prisma.reserva.findMany({ where: { fecha }, select: { bahia: true, inicioMin: true, finMin: true } });
  return horarios(fecha, s.min, ocupadas, ahora);
}

const sinAcentos = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Fechas hábiles entre dos días (inclusive), con las reservas de ejemplo ya generadas. */
async function fechasHabiles(desde: string, hasta: string) {
  const fechas: string[] = [];
  for (let f = desde; f <= hasta && fechas.length < 62; f = sumarDias(f, 1)) if (cierreDe(f)) fechas.push(f);
  await asegurarEjemplos(fechas);
  return fechas;
}

/** Reservas entre dos fechas (bot de Telegram). */
export async function reservasEntre(desde: string, hasta: string) {
  const fechas = await fechasHabiles(desde, hasta);
  const rs = await prisma.reserva.findMany({ where: { fecha: { in: fechas } }, orderBy: [{ fecha: "asc" }, { inicioMin: "asc" }, { bahia: "asc" }] });
  return rs.map(fila);
}

/** Reservas de un cliente (búsqueda sin acentos por cada palabra) en las últimas y próximas 2 semanas. */
export async function reservasDeCliente(nombre: string) {
  const hoy = ahoraLocal().fecha;
  const fechas = await fechasHabiles(sumarDias(hoy, -14), sumarDias(hoy, 14));
  const palabras = sinAcentos(nombre).split(/\s+/).filter((p) => p.length > 1);
  if (!palabras.length) return [];
  const rs = await prisma.reserva.findMany({
    where: { OR: [{ fecha: { in: fechas } }, { origen: "vivo" }] },
    orderBy: [{ fecha: "asc" }, { inicioMin: "asc" }],
  });
  return rs.filter((r) => palabras.every((p) => sinAcentos(r.clienteNombre).includes(p))).map(fila);
}

function fila(r: { id: string; folio: number | null; fecha: string; inicioMin: number; finMin: number; bahia: number; servicioId: number; clienteNombre: string; vehiculo: string | null; origen: string }) {
  const s = servicioDe(r.servicioId);
  return { folio: r.folio, fecha: r.fecha, inicio: hhmm(r.inicioMin), fin: hhmm(r.finMin), bahia: r.bahia, servicio: s?.nombre ?? "Servicio", precio: s?.precio ?? 0, cliente: r.clienteNombre, vehiculo: r.vehiculo };
}

// ---------- Reservar ----------

export const ReservaSchema = z.object({
  servicioId: z.coerce.number().int(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  inicioMin: z.coerce.number().int(),
  clienteId: z.coerce.number().int().optional().nullable(),
  nombre: z.string().trim().max(60).optional().nullable(),
  vehiculo: z.string().trim().max(80).optional().nullable(),
});

export class ErrorAgenda extends Error {
  constructor(msg: string, public status = 400) {
    super(msg);
  }
}

export async function reservar(d: z.infer<typeof ReservaSchema>) {
  const s = servicioDe(d.servicioId);
  if (!s) throw new ErrorAgenda("Elige un servicio.");
  const ahora = ahoraLocal();
  if (!diasAgenda(ahora).includes(d.fecha)) throw new ErrorAgenda("Ese día ya no está disponible.");
  const cliente = d.clienteId ? CLIENTES_AGENDA.find((c) => c.id === d.clienteId) : null;
  const nombre = cliente?.nombre ?? d.nombre ?? "";
  if (!nombre) throw new ErrorAgenda("Escribe el nombre del cliente.");
  if (tieneGroserias(nombre)) throw new ErrorAgenda("Usa otro nombre, por favor.");

  await asegurarEjemplos([d.fecha]);
  // Candado de la transacción: dos personas no pueden apartar el mismo hueco al mismo tiempo.
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(40404)");
    const ocupadas = await tx.reserva.findMany({ where: { fecha: d.fecha }, select: { bahia: true, inicioMin: true, finMin: true } });
    const lista = horarios(d.fecha, s.min, ocupadas, ahora);
    if (!lista.find((h) => h.min === d.inicioMin)?.libre) {
      const sig = lista.find((h) => h.libre && h.min > d.inicioMin) ?? lista.find((h) => h.libre);
      throw new ErrorAgenda(sig ? `Ese horario ya se ocupó. El siguiente libre es a las ${hhmm(sig.min)}.` : "Ya no quedan horarios libres ese día.", 409);
    }
    const bahia = bahiaLibre(ocupadas, d.inicioMin, d.inicioMin + s.min)!;
    const ultimo = await tx.reserva.aggregate({ _max: { folio: true } });
    const folio = Math.max(1000, ultimo._max.folio ?? 1000) + 1;
    return tx.reserva.create({
      data: { id: randomUUID(), folio, fecha: d.fecha, inicioMin: d.inicioMin, finMin: d.inicioMin + s.min, bahia, servicioId: s.id, clienteNombre: nombre, vehiculo: cliente?.vehiculo ?? (d.vehiculo || null), origen: "vivo" },
    });
  });
}

// ---------- Resumen (admin) ----------

export async function resumenAgenda(diasCalendario: number) {
  const ahora = ahoraLocal();
  const fechas: string[] = [];
  for (let i = 0; i < diasCalendario; i++) {
    const f = sumarDias(ahora.fecha, i);
    if (cierreDe(f)) fechas.push(f);
  }
  await asegurarEjemplos(fechas);
  const rs = await prisma.reserva.findMany({ where: { fecha: { in: fechas } }, orderBy: [{ fecha: "asc" }, { inicioMin: "asc" }, { bahia: "asc" }] });

  const filas = rs.map((r) => {
    const s = servicioDe(r.servicioId);
    return { id: r.id, folio: r.folio, fecha: r.fecha, inicioMin: r.inicioMin, finMin: r.finMin, bahia: r.bahia, servicio: s?.nombre ?? "Servicio", precio: s?.precio ?? 0, cliente: r.clienteNombre, vehiculo: r.vehiculo, vivo: r.origen === "vivo", creada: r.createdAt.toISOString() };
  });
  const suma = (xs: typeof filas) => ({
    n: xs.length,
    horas: xs.reduce((a, r) => a + (r.finMin - r.inicioMin), 0) / 60,
    ingreso: xs.reduce((a, r) => a + r.precio, 0),
  });
  const capacidad = (f: string) => (BAHIAS.length * (cierreDe(f)! - HORARIO.abre)) / 60;
  const total = suma(filas);

  return {
    desde: fechas[0],
    hasta: fechas[fechas.length - 1],
    total: { ...total, vivo: filas.filter((r) => r.vivo).length, ocupacion: total.horas / fechas.reduce((a, f) => a + capacidad(f), 0) },
    porServicio: SERVICIOS.map((s) => ({ nombre: s.nombre, ...suma(filas.filter((r) => r.servicio === s.nombre)) })).sort((a, b) => b.ingreso - a.ingreso),
    porDia: fechas.map((f) => {
      const t = suma(filas.filter((r) => r.fecha === f));
      return { fecha: f, etiqueta: etiquetaDia(f), ...t, ocupacion: t.horas / capacidad(f) };
    }),
    filas,
  };
}
export type ResumenAgenda = Awaited<ReturnType<typeof resumenAgenda>>;
