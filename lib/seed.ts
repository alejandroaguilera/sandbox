import { Prisma } from "@prisma/client";
import { prisma } from "./db";

// Seed determinístico e idempotente: mismos datos en cada arranque (semilla fija,
// ids explícitos, upsert / skipDuplicates). Seguro de correr en cada boot.

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type TipoCliente = "tiendita" | "restaurante" | "hotel" | "cadena";
interface ClienteSeed {
  id: number;
  nombre: string;
  giro: TipoCliente;
  ciudad: string;
  peso: number; // frecuencia relativa de compra
  qty: [number, number];
  descuento: number; // sobre precio de lista
  hasta?: string; // última fecha en que compra (dejó de comprar)
}

const NL = "Nuevo Laredo";
export const CLIENTES: ClienteSeed[] = [
  { id: 1, nombre: "Súper Frontera (cadena, 6 sucursales)", giro: "cadena", ciudad: NL, peso: 7, qty: [25, 60], descuento: 0.12 },
  { id: 2, nombre: "Hotel Río Bravo", giro: "hotel", ciudad: NL, peso: 5.5, qty: [12, 32], descuento: 0 },
  { id: 3, nombre: "Restaurante El Asadero Norteño", giro: "restaurante", ciudad: NL, peso: 4.5, qty: [15, 38], descuento: 0.02, hasta: "2026-06-12" },
  { id: 4, nombre: "Hotel Posada Real", giro: "hotel", ciudad: NL, peso: 3, qty: [10, 25], descuento: 0.02 },
  { id: 5, nombre: "Restaurante La Fogata", giro: "restaurante", ciudad: NL, peso: 3, qty: [8, 25], descuento: 0.02 },
  { id: 6, nombre: "Minisúper El Güero", giro: "tiendita", ciudad: NL, peso: 3, qty: [5, 18], descuento: 0 },
  { id: 7, nombre: "Hotel Plaza Aduana", giro: "hotel", ciudad: NL, peso: 3, qty: [8, 22], descuento: 0.03 },
  { id: 8, nombre: "Tacos Don Chuy", giro: "restaurante", ciudad: NL, peso: 3, qty: [6, 20], descuento: 0 },
  { id: 9, nombre: "Abarrotes Doña Lupe", giro: "tiendita", ciudad: NL, peso: 2, qty: [3, 12], descuento: 0, hasta: "2026-05-22" },
  { id: 10, nombre: "Tiendita La Esperanza", giro: "tiendita", ciudad: NL, peso: 2, qty: [3, 10], descuento: 0 },
  { id: 11, nombre: "Mariscos El Puerto", giro: "restaurante", ciudad: NL, peso: 2, qty: [6, 18], descuento: 0.01 },
  { id: 12, nombre: "Abarrotes San José", giro: "tiendita", ciudad: NL, peso: 2, qty: [3, 12], descuento: 0 },
  { id: 13, nombre: "Hotel Camino Real del Norte", giro: "hotel", ciudad: NL, peso: 2, qty: [8, 20], descuento: 0.03 },
  { id: 14, nombre: "Cafetería La Estación", giro: "restaurante", ciudad: NL, peso: 2, qty: [4, 14], descuento: 0 },
  { id: 15, nombre: "Minisúper Las Torres", giro: "tiendita", ciudad: NL, peso: 2, qty: [3, 12], descuento: 0 },
  { id: 16, nombre: "Tiendita Don Beto", giro: "tiendita", ciudad: NL, peso: 1.5, qty: [2, 9], descuento: 0 },
  { id: 17, nombre: "Restaurante Los Arcos", giro: "restaurante", ciudad: NL, peso: 2, qty: [5, 16], descuento: 0.01 },
  { id: 18, nombre: "Abarrotes El Sol", giro: "tiendita", ciudad: NL, peso: 1.5, qty: [2, 10], descuento: 0 },
  { id: 19, nombre: "Hotel Express Frontera", giro: "hotel", ciudad: NL, peso: 1.5, qty: [6, 16], descuento: 0.02 },
  { id: 20, nombre: "Tiendita Mi Barrio", giro: "tiendita", ciudad: NL, peso: 1.5, qty: [2, 9], descuento: 0 },
  { id: 21, nombre: "Pizzería Nonna", giro: "restaurante", ciudad: NL, peso: 1.5, qty: [4, 12], descuento: 0 },
  { id: 22, nombre: "Abarrotes La Güera", giro: "tiendita", ciudad: NL, peso: 1.2, qty: [2, 9], descuento: 0 },
  { id: 23, nombre: "Minisúper Colonia Madero", giro: "tiendita", ciudad: NL, peso: 1.2, qty: [2, 10], descuento: 0 },
  { id: 24, nombre: "Tiendita Los Pinos", giro: "tiendita", ciudad: NL, peso: 1, qty: [2, 8], descuento: 0 },
  { id: 25, nombre: "Fonda Doña Mary", giro: "restaurante", ciudad: NL, peso: 1, qty: [3, 10], descuento: 0 },
];

// 5 categorías; "Desechables y empaques" con margen claramente mayor (~40% vs 12–22%).
export const PRODUCTOS: { id: number; nombre: string; categoria: string; precio: number; costo: number }[] = [
  // Abarrotes secos (~15%)
  { id: 1, nombre: "Arroz 1 kg (caja 10)", categoria: "Abarrotes secos", precio: 320, costo: 272 },
  { id: 2, nombre: "Frijol pinto 1 kg (caja 10)", categoria: "Abarrotes secos", precio: 380, costo: 325 },
  { id: 3, nombre: "Aceite vegetal 1 L (caja 12)", categoria: "Abarrotes secos", precio: 540, costo: 462 },
  { id: 4, nombre: "Azúcar 1 kg (caja 10)", categoria: "Abarrotes secos", precio: 310, costo: 266 },
  { id: 5, nombre: "Harina de trigo 1 kg (caja 10)", categoria: "Abarrotes secos", precio: 250, costo: 212 },
  { id: 6, nombre: "Pasta para sopa (caja 20)", categoria: "Abarrotes secos", precio: 220, costo: 184 },
  // Bebidas (~18%)
  { id: 7, nombre: "Refresco cola 600 ml (caja 24)", categoria: "Bebidas", precio: 390, costo: 322 },
  { id: 8, nombre: "Agua natural 1 L (caja 12)", categoria: "Bebidas", precio: 150, costo: 121 },
  { id: 9, nombre: "Jugo de naranja 1 L (caja 12)", categoria: "Bebidas", precio: 420, costo: 348 },
  { id: 10, nombre: "Café soluble 200 g (caja 12)", categoria: "Bebidas", precio: 1150, costo: 950 },
  { id: 11, nombre: "Bebida isotónica (caja 24)", categoria: "Bebidas", precio: 520, costo: 428 },
  { id: 12, nombre: "Agua mineral 355 ml (caja 24)", categoria: "Bebidas", precio: 360, costo: 296 },
  // Lácteos y refrigerados (~12%)
  { id: 13, nombre: "Leche entera 1 L (caja 12)", categoria: "Lácteos y refrigerados", precio: 330, costo: 292 },
  { id: 14, nombre: "Queso asadero 1 kg", categoria: "Lácteos y refrigerados", precio: 165, costo: 144 },
  { id: 15, nombre: "Crema 1 L", categoria: "Lácteos y refrigerados", precio: 78, costo: 69 },
  { id: 16, nombre: "Mantequilla 1 kg", categoria: "Lácteos y refrigerados", precio: 210, costo: 186 },
  { id: 17, nombre: "Yogur bebible (caja 12)", categoria: "Lácteos y refrigerados", precio: 250, costo: 220 },
  { id: 18, nombre: "Jamón de pavo 1 kg", categoria: "Lácteos y refrigerados", precio: 185, costo: 162 },
  // Limpieza (~22%)
  { id: 19, nombre: "Detergente en polvo 5 kg", categoria: "Limpieza", precio: 260, costo: 204 },
  { id: 20, nombre: "Cloro 3.75 L (caja 4)", categoria: "Limpieza", precio: 190, costo: 148 },
  { id: 21, nombre: "Desengrasante industrial 20 L", categoria: "Limpieza", precio: 640, costo: 498 },
  { id: 22, nombre: "Jabón para trastes 5 L", categoria: "Limpieza", precio: 230, costo: 180 },
  { id: 23, nombre: "Papel higiénico (bulto 48)", categoria: "Limpieza", precio: 420, costo: 330 },
  { id: 24, nombre: "Toalla interdoblada (caja 20)", categoria: "Limpieza", precio: 520, costo: 404 },
  // Desechables y empaques (~40%)
  { id: 25, nombre: "Vaso térmico 12 oz (caja 1000)", categoria: "Desechables y empaques", precio: 780, costo: 465 },
  { id: 26, nombre: "Contenedor unicel 8x8 (caja 200)", categoria: "Desechables y empaques", precio: 460, costo: 272 },
  { id: 27, nombre: "Bolsa camiseta (paquete 1000)", categoria: "Desechables y empaques", precio: 350, costo: 208 },
  { id: 28, nombre: "Servilleta (caja 12 paquetes)", categoria: "Desechables y empaques", precio: 290, costo: 175 },
  { id: 29, nombre: "Cubiertos desechables (caja 1000)", categoria: "Desechables y empaques", precio: 410, costo: 243 },
  { id: 30, nombre: "Película plástica 30 cm", categoria: "Desechables y empaques", precio: 240, costo: 146 },
];

// Preferencias de categoría por tipo de cliente (índices de PRODUCTOS por categoría).
const PREF: Record<TipoCliente, Record<string, number>> = {
  cadena: { "Abarrotes secos": 4, Bebidas: 4, "Lácteos y refrigerados": 3, Limpieza: 1.5, "Desechables y empaques": 0.4 },
  tiendita: { "Abarrotes secos": 4, Bebidas: 4, "Lácteos y refrigerados": 2, Limpieza: 1.5, "Desechables y empaques": 0.6 },
  restaurante: { "Abarrotes secos": 2.5, Bebidas: 2, "Lácteos y refrigerados": 2.5, Limpieza: 1.5, "Desechables y empaques": 2.5 },
  hotel: { "Abarrotes secos": 1, Bebidas: 2.5, "Lácteos y refrigerados": 1.5, Limpieza: 3.5, "Desechables y empaques": 3 },
};

function elige<T>(rnd: () => number, items: T[], peso: (t: T) => number): T {
  const total = items.reduce((s, i) => s + peso(i), 0);
  let r = rnd() * total;
  for (const i of items) {
    r -= peso(i);
    if (r <= 0) return i;
  }
  return items[items.length - 1];
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const dia = (s: string) => new Date(`${s}T12:00:00Z`);

export function generarDatos() {
  const rnd = mulberry32(20260929);
  const inicio = dia("2025-10-01");
  const fin = dia("2026-09-26");
  const ventas: {
    id: number; fecha: Date; clienteId: number; productoId: number; cantidad: number; precioUnit: number; costoUnit: number;
  }[] = [];
  let id = 1;
  for (let d = new Date(inicio); d <= fin; d = new Date(d.getTime() + 86400000)) {
    const mes = d.getUTCMonth();
    const dow = d.getUTCDay();
    if (dow === 0) continue; // domingo no se reparte
    let n = 4.5;
    if (mes === 11) n *= 1.9; // diciembre
    if (mes === 10) n *= 1.15;
    if (mes === 0) n *= 0.8;
    const cuantas = Math.floor(n + rnd());
    for (let k = 0; k < cuantas; k++) {
      const activos = CLIENTES.filter((c) => !c.hasta || d <= dia(c.hasta));
      const c = elige(rnd, activos, (x) => x.peso);
      const p = elige(rnd, PRODUCTOS, (x) => PREF[c.giro][x.categoria] ?? 1);
      let cantidad = Math.round(c.qty[0] + rnd() * (c.qty[1] - c.qty[0]));
      if (mes === 11) cantidad = Math.round(cantidad * 1.3);
      ventas.push({
        id: id++,
        fecha: new Date(d.getTime() + Math.floor(rnd() * 8) * 3600000 - 4 * 3600000),
        clienteId: c.id,
        productoId: p.id,
        cantidad,
        precioUnit: r2(p.precio * (1 - c.descuento)),
        costoUnit: p.costo,
      });
    }
  }

  // Facturas: una por cliente por mes, vencimiento a 30 días.
  const porClienteMes = new Map<string, number>();
  for (const v of ventas) {
    const k = `${v.clienteId}|${v.fecha.getUTCFullYear()}-${v.fecha.getUTCMonth()}`;
    porClienteMes.set(k, (porClienteMes.get(k) ?? 0) + v.cantidad * v.precioUnit);
  }
  const hoyRef = dia("2026-09-28");
  // Cartera vencida plantada en 3 clientes: (clienteId -> meses [año-mes] sin pagar)
  const sinPagar: Record<number, string[]> = {
    4: ["2026-4", "2026-5", "2026-6"], // Hotel Posada Real: >60 días
    5: ["2026-6"], // Restaurante La Fogata
    6: ["2026-6"], // Minisúper El Güero
  };
  const facturas: { id: number; clienteId: number; fecha: Date; vence: Date; monto: number; pagadaAt: Date | null }[] = [];
  let fid = 1;
  const claves = [...porClienteMes.keys()].sort((a, b) => {
    const [ca, ma] = a.split("|");
    const [cb, mb] = b.split("|");
    const [ya, mma] = ma.split("-").map(Number);
    const [yb, mmb] = mb.split("-").map(Number);
    return ya * 12 + mma - (yb * 12 + mmb) || Number(ca) - Number(cb);
  });
  for (const k of claves) {
    const [cid, ym] = k.split("|");
    const [y, m] = ym.split("-").map(Number);
    const clienteId = Number(cid);
    let fecha = new Date(Date.UTC(y, m + 1, 0, 12)); // último día del mes
    if (fecha > dia("2026-09-26")) fecha = dia("2026-09-26");
    const vence = new Date(fecha.getTime() + 30 * 86400000);
    const monto = r2((porClienteMes.get(k) ?? 0) * 1.16); // con IVA
    let pagadaAt: Date | null = new Date(fecha.getTime() + Math.floor(12 + rnd() * 20) * 86400000);
    if (vence > hoyRef) pagadaAt = null; // vigentes, aún no vencen
    if (sinPagar[clienteId]?.includes(ym)) pagadaAt = null;
    if (pagadaAt && pagadaAt > hoyRef) pagadaAt = null;
    facturas.push({ id: fid++, clienteId, fecha, vence, monto, pagadaAt });
  }
  return { ventas, facturas };
}

const GASTOS_EJEMPLO = [
  { fecha: "2026-09-21", proveedor: "Gasolinera Servicio Aduana", rfc: "GSA0903125K8", subtotal: 1034.48, iva: 165.52, total: 1200, categoria: "Combustible", confianza: 0.95 },
  { fecha: "2026-09-22", proveedor: "Restaurante El Rancherito", rfc: "RRA1105238T1", subtotal: 560.34, iva: 89.66, total: 650, categoria: "Alimentos y viáticos", confianza: 0.91 },
  { fecha: "2026-09-23", proveedor: "Papelería La Pluma", rfc: "PLP150611QW2", subtotal: 301.72, iva: 48.28, total: 350, categoria: "Papelería y oficina", confianza: 0.88 },
  { fecha: "2026-09-24", proveedor: "Ferretería y Refacciones del Norte", rfc: "FRN0808084J9", subtotal: 1810.34, iva: 289.66, total: 2100, categoria: "Mantenimiento", confianza: 0.86 },
  { fecha: "2026-09-25", proveedor: "Tienda de conveniencia", rfc: null, subtotal: null, iva: null, total: 187.5, categoria: "Otros", confianza: 0.52 },
];

export async function seed() {
  const t0 = Date.now();
  for (const c of CLIENTES) {
    const data = { nombre: c.nombre, giro: c.giro, ciudad: c.ciudad };
    await prisma.cliente.upsert({ where: { id: c.id }, create: { id: c.id, ...data }, update: data });
  }
  for (const p of PRODUCTOS) {
    const data = { nombre: p.nombre, categoria: p.categoria, precio: p.precio, costo: p.costo };
    await prisma.producto.upsert({ where: { id: p.id }, create: { id: p.id, ...data }, update: data });
  }
  const { ventas, facturas } = generarDatos();
  const nv = await prisma.venta.count();
  if (nv !== ventas.length) {
    // Si cambió el generador, se regenera completo (datos ficticios, no hay nada que perder).
    await prisma.venta.deleteMany();
    await prisma.factura.deleteMany();
  }
  for (let i = 0; i < ventas.length; i += 500) {
    await prisma.venta.createMany({ data: ventas.slice(i, i + 500), skipDuplicates: true });
  }
  await prisma.factura.createMany({ data: facturas, skipDuplicates: true });

  if ((await prisma.gasto.count({ where: { origen: "ejemplo" } })) === 0) {
    await prisma.gasto.createMany({
      data: GASTOS_EJEMPLO.map((g, i) => ({
        ...g,
        fecha: dia(g.fecha),
        subtotal: g.subtotal === null ? null : new Prisma.Decimal(g.subtotal),
        iva: g.iva === null ? null : new Prisma.Decimal(g.iva),
        total: new Prisma.Decimal(g.total),
        revisar: g.confianza < 0.75 || g.subtotal === null,
        origen: "ejemplo",
        createdAt: new Date(Date.UTC(2026, 8, 25, 12, i)),
      })),
    });
  }
  console.log(`[seed] ok: ${ventas.length} ventas, ${facturas.length} facturas (${Date.now() - t0} ms)`);
}
