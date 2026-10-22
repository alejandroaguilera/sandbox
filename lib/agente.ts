import { z } from "zod";
import { agregados, RespuestaSchema, type Respuesta } from "./datos";
import { ErrorAgenda, ahoraLocal, cierreDe, diasAgenda, disponibilidad, reservar, reservasDeCliente, reservasEntre, sumarDias } from "./agenda";
import { CLIENTES_AGENDA, HORARIO, NEGOCIO, SERVICIOS, etiquetaDia, hhmm, pesos, servicioDe } from "./agenda-catalogo";
import { EMPRESA_FICTICIA } from "./constantes";

// Agente del bot de Telegram: Grok (xAI, API compatible con OpenAI) con herramientas sobre
// la Demo 3 (Pregúntale a tus datos) y la Demo 4 (Agenda de servicios).
const MODELO = process.env.XAI_MODEL || "grok-4.7";
const ESFUERZO = process.env.XAI_REASONING_EFFORT || "low";

export interface Mensaje {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
}

const HERRAMIENTAS = [
  {
    name: "datos_empresa",
    description: `Datos de ventas, márgenes, clientes, productos y cuentas por cobrar de ${EMPRESA_FICTICIA} (últimos 12 meses). Úsala para cualquier pregunta de "Pregúntale a tus datos".`,
    parameters: { type: "object", properties: {} },
  },
  {
    name: "enviar_grafica",
    description: "Manda al usuario una gráfica como imagen, junto con tu respuesta. Úsala una vez cuando respondas una pregunta de datos de la empresa.",
    parameters: {
      type: "object",
      properties: {
        tipo: { type: "string", enum: ["barras", "linea"], description: "barras para comparar (de mayor a menor, máx 10), linea para evolución en el tiempo" },
        titulo: { type: "string" },
        etiquetas: { type: "array", items: { type: "string" } },
        valores: { type: "array", items: { type: "number" }, description: "números sin formato" },
        formato: { type: "string", enum: ["moneda", "porcentaje", "numero"], description: "porcentaje: 24.5 = 24.5%" },
      },
      required: ["tipo", "titulo", "etiquetas", "valores", "formato"],
    },
  },
  {
    name: "consultar_agenda",
    description: "Servicios agendados en el taller entre dos fechas (inclusive, máximo 31 días). Úsala para 'qué hay hoy', 'mañana', 'esta semana', ocupación, ingresos esperados, etc.",
    parameters: {
      type: "object",
      properties: { desde: { type: "string", description: "AAAA-MM-DD" }, hasta: { type: "string", description: "AAAA-MM-DD" } },
      required: ["desde", "hasta"],
    },
  },
  {
    name: "buscar_cliente",
    description: "Servicios de un cliente (pasados y próximos) buscando por nombre o parte del nombre.",
    parameters: { type: "object", properties: { nombre: { type: "string" } }, required: ["nombre"] },
  },
  {
    name: "horarios_disponibles",
    description: "Horarios de inicio libres para un servicio en un día.",
    parameters: {
      type: "object",
      properties: { fecha: { type: "string", description: "AAAA-MM-DD" }, servicio_id: { type: "integer" } },
      required: ["fecha", "servicio_id"],
    },
  },
  {
    name: "agendar_servicio",
    description: "Agenda un servicio en el taller. La bahía se asigna sola. Devuelve el folio.",
    parameters: {
      type: "object",
      properties: {
        servicio_id: { type: "integer" },
        fecha: { type: "string", description: "AAAA-MM-DD" },
        hora: { type: "string", description: "HH:MM de inicio, 24 h, en múltiplos de 30 min" },
        cliente: { type: "string", description: "Nombre del cliente" },
        vehiculo: { type: "string", description: "Vehículo, si el usuario lo dijo" },
      },
      required: ["servicio_id", "fecha", "hora", "cliente"],
    },
  },
] as const;

function sistema() {
  const ahora = ahoraLocal();
  const dias = diasAgenda(ahora);
  return `Eres el asistente por Telegram de un dueño de negocio, en una demostración en vivo ante empresarios (datos ficticios). Hablas español de México, claro, breve y amable.

Hoy es ${etiquetaDia(ahora.fecha, true)} (${ahora.fecha}), son las ${hhmm(ahora.min)}. Mañana es ${sumarDias(ahora.fecha, 1)}.

Atiendes dos módulos:

1) PREGÚNTALE A TUS DATOS — ${EMPRESA_FICTICIA}, una distribuidora. Para cualquier pregunta de ventas, clientes de la distribuidora, productos, márgenes o cobranza, llama a datos_empresa y responde SOLO con esos datos (no inventes cifras ni clientes; si no alcanzan, dilo). Respuesta de 2 a 5 renglones con nombres y cifras concretas (pesos redondeados con separador de miles); si hay un hallazgo no obvio, dilo. Después llama a enviar_grafica con una gráfica que apoye la respuesta.

2) AGENDA DE SERVICIOS — ${NEGOCIO}, un taller mecánico con 4 bahías.
Horario: lunes a viernes ${hhmm(HORARIO.abre)}–${hhmm(HORARIO.cierra)}, sábado ${hhmm(HORARIO.abre)}–${hhmm(HORARIO.cierraSabado)}, domingo cerrado. Citas cada 30 min; 30 min libres entre servicios en la misma bahía.
Servicios (id · nombre · duración · precio):
${SERVICIOS.map((s) => `${s.id} · ${s.nombre} · ${s.min} min · ${pesos(s.precio)}`).join("\n")}
Clientes frecuentes: ${CLIENTES_AGENDA.map((c) => `${c.nombre} (${c.vehiculo})`).join("; ")}. También se puede agendar a cualquier cliente nuevo.
Días que aceptan citas nuevas: ${dias.map((f) => `${etiquetaDia(f)} (${f})`).join(", ")}.
- Para consultar usa consultar_agenda o buscar_cliente. Para hoy/mañana/semana calcula las fechas tú.
- Para agendar necesitas servicio, día, hora y nombre del cliente. Si falta algo, pregúntalo (ofrece horarios con horarios_disponibles). Si ya tienes todo, agenda directo con agendar_servicio, sin pedir confirmación, y confirma con folio, día, hora y bahía. Si el horario está ocupado, ofrece los más cercanos.
- Al listar servicios, uno por renglón en orden de hora: hora · servicio · cliente (vehículo) · bahía. No agrupes con títulos como "Mañana" o "Tarde" (se confunde con el día de mañana). Si son más de 15, resume y ofrece el detalle.
- Al buscar un cliente, di su último servicio pasado y los próximos, con día y hora.

Formato: Telegram con HTML sencillo: <b>negritas</b> e <i>cursivas</i> nada más. Nada de Markdown (ni ** ni # ni tablas). Usa emojis con moderación.
Si te preguntan algo fuera de estos dos módulos, explica amablemente qué puedes hacer.`;
}

// ---------- Ejecución de herramientas ----------

const Fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

async function ejecutar(nombre: string, args: Record<string, unknown>, graficas: Respuesta["grafica"][]): Promise<unknown> {
  switch (nombre) {
    case "datos_empresa":
      return agregados();
    case "enviar_grafica": {
      const g = RespuestaSchema.shape.grafica.safeParse(args);
      if (!g.success) return { error: "Gráfica inválida: revisa tipo, etiquetas y valores." };
      if (graficas.length < 2) graficas.push(g.data);
      return { ok: true, nota: "La imagen se manda junto con tu respuesta; no la describas de más." };
    }
    case "consultar_agenda": {
      const desde = Fecha.parse(args.desde);
      let hasta = Fecha.parse(args.hasta);
      if (hasta < desde) return { error: "La fecha final es anterior a la inicial." };
      if (hasta > sumarDias(desde, 30)) hasta = sumarDias(desde, 30);
      const servicios = await reservasEntre(desde, hasta);
      const cerrados = [];
      for (let f = desde; f <= hasta; f = sumarDias(f, 1)) if (!cierreDe(f)) cerrados.push(f);
      return { desde, hasta, total: servicios.length, ingresoEsperado: servicios.reduce((a, s) => a + s.precio, 0), diasCerrados: cerrados, servicios };
    }
    case "buscar_cliente": {
      const nombre = String(args.nombre ?? "").trim();
      const servicios = await reservasDeCliente(nombre);
      const hoy = ahoraLocal().fecha;
      return {
        buscado: nombre,
        hoy,
        periodo: { desde: sumarDias(hoy, -14), hasta: sumarDias(hoy, 14), nota: "La agenda solo guarda 2 semanas atrás y 2 adelante: no hay historial anterior." },
        total: servicios.length,
        servicios,
      };
    }
    case "horarios_disponibles": {
      const fecha = Fecha.parse(args.fecha);
      const s = servicioDe(Number(args.servicio_id));
      if (!s) return { error: "Servicio inexistente." };
      if (!diasAgenda().includes(fecha)) return { error: "Ese día no acepta citas nuevas.", diasDisponibles: diasAgenda() };
      const libres = (await disponibilidad(fecha, s.id)).filter((h) => h.libre).map((h) => hhmm(h.min));
      return { fecha, servicio: s.nombre, libres };
    }
    case "agendar_servicio": {
      const m = /^(\d{1,2}):(\d{2})$/.exec(String(args.hora ?? "").trim());
      if (!m) return { error: "Hora inválida, usa HH:MM." };
      const inicioMin = Number(m[1]) * 60 + Number(m[2]);
      if (inicioMin % HORARIO.paso) return { error: "Las citas empiezan en punto o a la media hora." };
      try {
        const r = await reservar({
          servicioId: Number(args.servicio_id),
          fecha: Fecha.parse(args.fecha),
          inicioMin,
          nombre: String(args.cliente ?? "").trim().slice(0, 60),
          vehiculo: args.vehiculo ? String(args.vehiculo).trim().slice(0, 80) : null,
        });
        return { ok: true, folio: r.folio, fecha: r.fecha, dia: etiquetaDia(r.fecha, true), inicio: hhmm(r.inicioMin), fin: hhmm(r.finMin), bahia: r.bahia, servicio: servicioDe(r.servicioId)?.nombre, cliente: r.clienteNombre, vehiculo: r.vehiculo };
      } catch (e) {
        if (e instanceof ErrorAgenda) return { error: e.message };
        throw e;
      }
    }
  }
  return { error: `Herramienta desconocida: ${nombre}` };
}

// ---------- Bucle del agente ----------

async function grok(mensajes: Mensaje[]) {
  const r = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.XAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODELO,
      ...(ESFUERZO !== "none" ? { reasoning_effort: ESFUERZO } : {}),
      messages: mensajes,
      tools: HERRAMIENTAS.map((h) => ({ type: "function", function: h })),
      max_tokens: 2500,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j?.choices?.[0]) throw new Error(`[grok] ${r.status} ${JSON.stringify(j?.error ?? j).slice(0, 300)}`);
  return j.choices[0].message as Mensaje;
}

export interface Resultado { texto: string; graficas: Respuesta["grafica"][]; nuevos: Mensaje[] }

/** Corre el agente sobre el historial; devuelve el texto final, gráficas y los mensajes nuevos para el historial. */
export async function conversar(historial: Mensaje[], texto: string): Promise<Resultado> {
  if (!process.env.XAI_API_KEY) throw new Error("XAI_API_KEY no configurada");
  const nuevos: Mensaje[] = [{ role: "user", content: texto }];
  const graficas: Respuesta["grafica"][] = [];
  for (let paso = 0; paso < 8; paso++) {
    const m = await grok([{ role: "system", content: sistema() }, ...historial, ...nuevos]);
    const llamadas = m.tool_calls ?? [];
    nuevos.push({ role: "assistant", content: m.content ?? "", ...(llamadas.length ? { tool_calls: llamadas } : {}) });
    if (!llamadas.length) return { texto: m.content || "Listo.", graficas, nuevos };
    for (const t of llamadas) {
      let salida: unknown;
      try {
        salida = await ejecutar(t.function.name, JSON.parse(t.function.arguments || "{}"), graficas);
      } catch (e) {
        console.error(`[agente] ${t.function.name} falló:`, (e as Error).message);
        salida = { error: e instanceof z.ZodError ? "Fecha inválida, usa AAAA-MM-DD." : "No se pudo completar, intenta de nuevo." };
      }
      nuevos.push({ role: "tool", tool_call_id: t.id, content: JSON.stringify(salida) });
    }
  }
  return { texto: "Me enredé con esa solicitud. ¿Me la dices de otra forma?", graficas, nuevos };
}
