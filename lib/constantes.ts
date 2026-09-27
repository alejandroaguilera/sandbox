export const DIMENSIONES = [
  { id: "DIRECCION", nombre: "Dirección", desc: "medir y decidir" },
  { id: "COMERCIAL", nombre: "Comercial", desc: "vender y dar seguimiento" },
  { id: "OPERACION", nombre: "Operación", desc: "entregar lo que vendes" },
  { id: "ADMIN_FINANZAS", nombre: "Administración y Finanzas", desc: "facturar, cobrar, pagar" },
  { id: "PERSONAS", nombre: "Personas", desc: "contratar y pagar nómina" },
  { id: "EXPERIENCIA_DIGITAL", nombre: "Experiencia digital", desc: "lo que tu cliente ve y usa" },
] as const;

export const TAMANOS = [
  { id: "T1_10", nombre: "1–10" },
  { id: "T11_50", nombre: "11–50" },
  { id: "T51_250", nombre: "51–250" },
  { id: "T250_MAS", nombre: "250+" },
] as const;

export const DIMENSION_IDS = DIMENSIONES.map((d) => d.id) as unknown as [string, ...string[]];
export const TAMANO_IDS = TAMANOS.map((t) => t.id) as unknown as [string, ...string[]];

export const CATEGORIAS_GASTO = [
  "Combustible",
  "Alimentos y viáticos",
  "Papelería y oficina",
  "Mantenimiento",
  "Servicios",
  "Materia prima",
  "Otros",
] as const;

export const EMPRESA_FICTICIA = "Distribuidora Ejemplo del Norte, S.A. de C.V.";
