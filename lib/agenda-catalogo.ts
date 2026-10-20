// Demo 4: catálogo del taller ficticio. Sin imports de servidor: lo usan también los formularios.

export const NEGOCIO = "Taller Ejemplo del Norte";

export const BAHIAS = [1, 2, 3, 4];

export const HORARIO = {
  abre: 9 * 60,
  cierra: 19 * 60,
  cierraSabado: 14 * 60,
  paso: 30, // los horarios se ofrecen cada 30 min
  colchon: 30, // regla del negocio: 30 min libres entre un servicio y otro en la misma bahía
};

export const SERVICIOS = [
  { id: 1, nombre: "Cambio de aceite y filtro", min: 60, precio: 1150 },
  { id: 2, nombre: "Afinación mayor", min: 180, precio: 3400 },
  { id: 3, nombre: "Alineación y balanceo", min: 90, precio: 950 },
  { id: 4, nombre: "Frenos: balatas y rectificado", min: 150, precio: 2600 },
  { id: 5, nombre: "Diagnóstico por computadora", min: 60, precio: 650 },
  { id: 6, nombre: "Aire acondicionado: carga y revisión", min: 120, precio: 1450 },
] as const;

export const CLIENTES_AGENDA = [
  { id: 1, nombre: "Ana Martínez", vehiculo: "Nissan Versa 2019" },
  { id: 2, nombre: "Roberto Garza", vehiculo: "Chevrolet Silverado 2021" },
  { id: 3, nombre: "Lucía Treviño", vehiculo: "Mazda 3 2020" },
  { id: 4, nombre: "Jorge Salinas", vehiculo: "Ford Lobo 2018" },
  { id: 5, nombre: "Mariana Cantú", vehiculo: "Honda CR-V 2022" },
  { id: 6, nombre: "Fernando Villarreal", vehiculo: "Toyota Hilux 2017" },
  { id: 7, nombre: "Paola Rodríguez", vehiculo: "Kia Rio 2021" },
  { id: 8, nombre: "Héctor Leal", vehiculo: "VW Jetta 2016" },
  { id: 9, nombre: "Daniela Guerra", vehiculo: "Hyundai Tucson 2023" },
  { id: 10, nombre: "Arturo Elizondo", vehiculo: "RAM 700 2020" },
  { id: 11, nombre: "Sofía Peña", vehiculo: "Nissan Kicks 2022" },
  { id: 12, nombre: "Ricardo Flores", vehiculo: "Chevrolet Aveo 2019" },
  { id: 13, nombre: "Transportes Del Bravo", vehiculo: "Ford Transit 2021" },
  { id: 14, nombre: "Gabriela Ochoa", vehiculo: "Toyota Corolla 2018" },
] as const;

export const servicioDe = (id: number) => SERVICIOS.find((s) => s.id === id);

export const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** "2026-10-22" → "jue 22 oct". Se formatea en UTC para que la zona del navegador no mueva el día. */
export function etiquetaDia(fecha: string, largo = false) {
  const d = new Date(`${fecha}T12:00:00Z`);
  return d
    .toLocaleDateString("es-MX", { timeZone: "UTC", weekday: largo ? "long" : "short", day: "numeric", month: largo ? "long" : "short" })
    .replace(/\./g, "")
    .replace(",", "");
}

export const pesos = (n: number) => "$" + n.toLocaleString("es-MX", { maximumFractionDigits: 0 });
