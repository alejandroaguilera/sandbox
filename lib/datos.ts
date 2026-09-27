import { z } from "zod";
import { prisma } from "./db";
import { EMPRESA_FICTICIA } from "./constantes";

export const PREGUNTAS = [
  "¿Cuánto me deja cada cliente?",
  "¿Cuál es mi producto más rentable?",
  "¿Cuánto me deben hoy y quién?",
  "¿Quién dejó de comprarme?",
] as const;

export const RespuestaSchema = z.object({
  respuesta: z.string(),
  grafica: z.object({
    tipo: z.enum(["barras", "linea"]),
    titulo: z.string(),
    etiquetas: z.array(z.string()),
    valores: z.array(z.number()),
    formato: z.enum(["moneda", "porcentaje", "numero"]),
  }),
  tabla: z
    .object({
      columnas: z.array(z.string()),
      filas: z.array(z.array(z.union([z.string(), z.number()]))),
    })
    .optional()
    .nullable(),
});
export type Respuesta = z.infer<typeof RespuestaSchema> & { origen?: "ia" | "cache" | "precalculada" };

interface Fuente {
  clientes: { id: number; nombre: string; giro: string }[];
  productos: { id: number; nombre: string; categoria: string }[];
  ventas: { fecha: Date; clienteId: number; productoId: number; cantidad: number; precioUnit: number; costoUnit: number }[];
  facturas: { clienteId: number; fecha: Date; vence: Date; monto: number; pagadaAt: Date | null }[];
}

const r0 = (n: number) => Math.round(n);
const r1 = (n: number) => Math.round(n * 10) / 10;
const DIA = 86400000;
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function calcularAgregados(f: Fuente, hoy = new Date()) {
  const desde = new Date(hoy.getTime() - 365 * DIA);
  const ventas = f.ventas.filter((v) => v.fecha >= desde && v.fecha <= hoy);

  const cli = new Map<number, { ventas: number; costo: number; ultima: Date | null; pedidos: number }>();
  const prod = new Map<number, { ventas: number; costo: number; unidades: number }>();
  const mes = new Map<string, { ventas: number; costo: number; orden: number }>();
  for (const v of ventas) {
    const imp = v.cantidad * v.precioUnit;
    const cos = v.cantidad * v.costoUnit;
    const c = cli.get(v.clienteId) ?? { ventas: 0, costo: 0, ultima: null, pedidos: 0 };
    c.ventas += imp;
    c.costo += cos;
    c.pedidos++;
    if (!c.ultima || v.fecha > c.ultima) c.ultima = v.fecha;
    cli.set(v.clienteId, c);
    const p = prod.get(v.productoId) ?? { ventas: 0, costo: 0, unidades: 0 };
    p.ventas += imp;
    p.costo += cos;
    p.unidades += v.cantidad;
    prod.set(v.productoId, p);
    const y = v.fecha.getUTCFullYear();
    const m = v.fecha.getUTCMonth();
    const k = `${MESES[m]} ${String(y).slice(2)}`;
    const e = mes.get(k) ?? { ventas: 0, costo: 0, orden: y * 12 + m };
    e.ventas += imp;
    e.costo += cos;
    mes.set(k, e);
  }

  const porCliente = f.clientes
    .map((c) => {
      const a = cli.get(c.id) ?? { ventas: 0, costo: 0, ultima: null, pedidos: 0 };
      const margen = a.ventas - a.costo;
      return {
        cliente: c.nombre,
        tipo: c.giro,
        ventas: r0(a.ventas),
        margen: r0(margen),
        margenPct: a.ventas ? r1((margen / a.ventas) * 100) : 0,
        pedidos: a.pedidos,
        ultimaCompra: a.ultima ? a.ultima.toISOString().slice(0, 10) : null,
        diasSinComprar: a.ultima ? Math.floor((hoy.getTime() - a.ultima.getTime()) / DIA) : null,
      };
    })
    .sort((a, b) => b.ventas - a.ventas)
    .map((c, i) => ({ ...c, rankingVentas: i + 1 }));

  const porProducto = f.productos
    .map((p) => {
      const a = prod.get(p.id) ?? { ventas: 0, costo: 0, unidades: 0 };
      const margen = a.ventas - a.costo;
      return {
        producto: p.nombre,
        categoria: p.categoria,
        unidades: a.unidades,
        ventas: r0(a.ventas),
        margen: r0(margen),
        margenPct: a.ventas ? r1((margen / a.ventas) * 100) : 0,
      };
    })
    .sort((a, b) => b.margen - a.margen);

  const catMap = new Map<string, { ventas: number; margen: number }>();
  for (const p of porProducto) {
    const e = catMap.get(p.categoria) ?? { ventas: 0, margen: 0 };
    e.ventas += p.ventas;
    e.margen += p.margen;
    catMap.set(p.categoria, e);
  }
  const porCategoria = [...catMap.entries()]
    .map(([categoria, e]) => ({ categoria, ventas: e.ventas, margen: e.margen, margenPct: r1((e.margen / e.ventas) * 100) }))
    .sort((a, b) => b.margenPct - a.margenPct);

  const porMes = [...mes.entries()]
    .sort((a, b) => a[1].orden - b[1].orden)
    .map(([m, e]) => ({ mes: m, ventas: r0(e.ventas), margen: r0(e.ventas - e.costo) }));

  // Cartera
  const nombre = new Map(f.clientes.map((c) => [c.id, c.nombre]));
  const cart = new Map<number, { abierto: number; vencido: number; diasMax: number; facturasVencidas: number }>();
  for (const fa of f.facturas) {
    if (fa.pagadaAt && fa.pagadaAt <= hoy) continue;
    const e = cart.get(fa.clienteId) ?? { abierto: 0, vencido: 0, diasMax: 0, facturasVencidas: 0 };
    e.abierto += fa.monto;
    if (fa.vence < hoy) {
      e.vencido += fa.monto;
      e.facturasVencidas++;
      e.diasMax = Math.max(e.diasMax, Math.floor((hoy.getTime() - fa.vence.getTime()) / DIA));
    }
    cart.set(fa.clienteId, e);
  }
  const cartera = [...cart.entries()]
    .map(([id, e]) => ({
      cliente: nombre.get(id) ?? String(id),
      saldoAbierto: r0(e.abierto),
      vencido: r0(e.vencido),
      facturasVencidas: e.facturasVencidas,
      diasVencidoMax: e.diasMax,
    }))
    .sort((a, b) => b.vencido - a.vencido || b.saldoAbierto - a.saldoAbierto);

  const totalVentas = porCliente.reduce((s, c) => s + c.ventas, 0);
  const totalMargen = porCliente.reduce((s, c) => s + c.margen, 0);
  const kpis = {
    ventas12m: totalVentas,
    margenPct: totalVentas ? r1((totalMargen / totalVentas) * 100) : 0,
    clientesActivos: porCliente.filter((c) => c.diasSinComprar !== null && c.diasSinComprar <= 60).length,
    clientesTotales: f.clientes.length,
    cxcVencidas: cartera.reduce((s, c) => s + c.vencido, 0),
    cxcTotal: cartera.reduce((s, c) => s + c.saldoAbierto, 0),
  };

  return {
    empresa: EMPRESA_FICTICIA,
    fechaCorte: hoy.toISOString().slice(0, 10),
    moneda: "MXN",
    notas: "Montos de ventas sin IVA; facturas y cartera con IVA. Últimos 12 meses.",
    kpis,
    porCliente,
    porProducto,
    porCategoria,
    porMes,
    cartera,
  };
}
export type Agregados = ReturnType<typeof calcularAgregados>;

let cacheAgg: { t: number; data: Agregados } | null = null;
export async function agregados(): Promise<Agregados> {
  if (cacheAgg && Date.now() - cacheAgg.t < 5 * 60 * 1000) return cacheAgg.data;
  const [clientes, productos, ventas, facturas] = await Promise.all([
    prisma.cliente.findMany(),
    prisma.producto.findMany(),
    prisma.venta.findMany(),
    prisma.factura.findMany(),
  ]);
  const data = calcularAgregados({
    clientes,
    productos,
    ventas: ventas.map((v) => ({ ...v, precioUnit: Number(v.precioUnit), costoUnit: Number(v.costoUnit) })),
    facturas: facturas.map((x) => ({ ...x, monto: Number(x.monto) })),
  });
  cacheAgg = { t: Date.now(), data };
  return data;
}

const $ = (n: number) => "$" + Math.round(n).toLocaleString("es-MX");

/** Respuestas calculadas sin IA: red de seguridad para las 4 preguntas sugeridas. */
export function precalculada(indice: number, a: Agregados): Respuesta {
  if (indice === 0) {
    const top = [...a.porCliente].filter((c) => c.ventas > 0).sort((x, y) => y.margen - x.margen).slice(0, 8);
    const masVende = a.porCliente[0];
    const masDeja = top[0];
    return {
      respuesta: `Tu cliente que más compra es ${masVende.cliente} (${$(masVende.ventas)}), pero solo te deja ${masVende.margenPct}% de margen porque compra con descuento. El que más utilidad te deja es ${masDeja.cliente}: ${$(masDeja.margen)} con ${masDeja.margenPct}% de margen.`,
      grafica: { tipo: "barras", titulo: "Utilidad por cliente (12 meses)", etiquetas: top.map((c) => c.cliente), valores: top.map((c) => c.margen), formato: "moneda" },
      tabla: {
        columnas: ["Cliente", "Ventas", "Utilidad", "Margen"],
        filas: top.slice(0, 5).map((c) => [c.cliente, $(c.ventas), $(c.margen), `${c.margenPct}%`]),
      },
      origen: "precalculada",
    };
  }
  if (indice === 1) {
    const cat = a.porCategoria;
    const p = a.porProducto[0];
    return {
      respuesta: `Tu categoría más rentable es ${cat[0].categoria}: ${cat[0].margenPct}% de margen, contra ${cat[cat.length - 1].margenPct}% de ${cat[cat.length - 1].categoria}. El producto que más utilidad te dejó fue ${p.producto} (${$(p.margen)}, ${p.margenPct}%).`,
      grafica: { tipo: "barras", titulo: "Margen por categoría", etiquetas: cat.map((c) => c.categoria), valores: cat.map((c) => c.margenPct), formato: "porcentaje" },
      tabla: {
        columnas: ["Producto", "Categoría", "Utilidad", "Margen"],
        filas: a.porProducto.slice(0, 5).map((x) => [x.producto, x.categoria, $(x.margen), `${x.margenPct}%`]),
      },
      origen: "precalculada",
    };
  }
  if (indice === 2) {
    const venc = a.cartera.filter((c) => c.vencido > 0);
    const peor = [...venc].sort((x, y) => y.diasVencidoMax - x.diasVencidoMax)[0];
    return {
      respuesta: `Hoy te deben ${$(a.kpis.cxcTotal)}; de eso, ${$(a.kpis.cxcVencidas)} ya está vencido y se concentra en ${venc.length} clientes. El caso más urgente es ${peor?.cliente ?? "—"}, con ${peor?.diasVencidoMax ?? 0} días de atraso.`,
      grafica: { tipo: "barras", titulo: "Cuentas por cobrar vencidas", etiquetas: venc.map((c) => c.cliente), valores: venc.map((c) => c.vencido), formato: "moneda" },
      tabla: {
        columnas: ["Cliente", "Vencido", "Facturas", "Días de atraso"],
        filas: venc.map((c) => [c.cliente, $(c.vencido), c.facturasVencidas, c.diasVencidoMax]),
      },
      origen: "precalculada",
    };
  }
  const perdidos = a.porCliente.filter((c) => (c.diasSinComprar ?? 0) > 90).sort((x, y) => y.ventas - x.ventas);
  const top = perdidos[0];
  return {
    respuesta: perdidos.length
      ? `${perdidos.length} clientes no te compran desde hace más de 90 días. Ojo con ${top.cliente}: era tu cliente #${top.rankingVentas} en ventas (${$(top.ventas)}) y lleva ${top.diasSinComprar} días sin comprar.`
      : "Todos tus clientes han comprado en los últimos 90 días.",
    grafica: {
      tipo: "barras",
      titulo: "Días sin comprar",
      etiquetas: perdidos.map((c) => c.cliente),
      valores: perdidos.map((c) => c.diasSinComprar ?? 0),
      formato: "numero",
    },
    tabla: {
      columnas: ["Cliente", "Última compra", "Días sin comprar", "Ventas 12m"],
      filas: perdidos.map((c) => [c.cliente, c.ultimaCompra ?? "—", c.diasSinComprar ?? 0, $(c.ventas)]),
    },
    origen: "precalculada",
  };
}

export function preguntaParecida(q: string): number {
  const t = q.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const exacta = PREGUNTAS.findIndex((p) => p.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") === t);
  if (exacta >= 0) return exacta;
  if (/deb|cobr|carter|venc|adeud/.test(t)) return 2;
  if (/dej(o|aron) de|perd|inactiv|ya no|dejo de/.test(t)) return 3;
  if (/product|rentab|categor|articul/.test(t)) return 1;
  return 0;
}
