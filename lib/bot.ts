import { conversar, type Mensaje } from "./agente";
import { ahoraLocal, cierreDe, reservasEntre, sumarDias } from "./agenda";
import { NEGOCIO, SERVICIOS, etiquetaDia, pesos } from "./agenda-catalogo";
import { EMPRESA_FICTICIA } from "./constantes";
import { PREGUNTAS } from "./datos";
import { graficaPng } from "./grafica-png";
import { permitido } from "./http";
import { BOTONES, TECLADO, enviar, enviarFoto, esc, escribiendo, responderBoton } from "./telegram";

// Estado por chat en memoria (una sola réplica): historial corto y si esperamos un nombre de cliente.
interface Chat { historial: Mensaje[]; t: number; esperaCliente?: boolean; cola: Promise<void> }
const g = globalThis as unknown as { __sbxChats?: Map<number, Chat>; __sbxUpdates?: Set<number> };
const chats = (g.__sbxChats ??= new Map());
const vistos = (g.__sbxUpdates ??= new Set());
const CADUCA = 45 * 60 * 1000;
const MAX_HISTORIAL = 30;

function chatDe(id: number): Chat {
  let c = chats.get(id);
  if (!c || Date.now() - c.t > CADUCA) {
    c = { historial: [], t: Date.now(), cola: c?.cola ?? Promise.resolve() };
    chats.set(id, c);
  }
  c.t = Date.now();
  return c;
}

/** Recorta el historial sin dejar respuestas de herramientas huérfanas, y aligera los datos de la empresa. */
function guardar(c: Chat, nuevos: Mensaje[]) {
  const ligeros = nuevos.map((m) =>
    m.role === "tool" && (m.content?.length ?? 0) > 3000
      ? { ...m, content: '{"nota":"Resultado largo omitido del historial; vuelve a llamar la herramienta si lo necesitas."}' }
      : m,
  );
  c.historial.push(...ligeros);
  while (c.historial.length > MAX_HISTORIAL) {
    c.historial.shift();
    while (c.historial.length && c.historial[0].role !== "user") c.historial.shift();
  }
}

const anotar = (c: Chat, usuario: string, bot: string) =>
  guardar(c, [{ role: "user", content: usuario }, { role: "assistant", content: bot }]);

// ---------- Respuestas fijas (sin IA: instantáneas) ----------

const BIENVENIDA = `👋 Hola, soy el asistente del sandbox.

Puedo ayudarte con dos módulos:
📊 <b>Pregúntale a tus datos</b> — ventas, clientes, márgenes y cobranza de <i>${esc(EMPRESA_FICTICIA)}</i>.
🗓️ <b>Agenda de servicios</b> — consultar y agendar citas en <i>${esc(NEGOCIO)}</i>.

Usa el menú de abajo o escríbeme como le escribirías a una persona, por ejemplo:
• <i>¿Qué servicios hay mañana?</i>
• <i>¿Qué servicio pidió Jorge Salinas y cuándo?</i>
• <i>Agenda una afinación para Laura Pérez el sábado a las 10</i>
• <i>¿Quién me debe más?</i>

<i>Datos ficticios de demostración.</i>`;

async function listaDia(fecha: string) {
  const titulo = `${etiquetaDia(fecha, true)}`;
  if (!cierreDe(fecha)) return `📅 <b>${titulo}</b>\nEl taller está cerrado ese día.`;
  const rs = await reservasEntre(fecha, fecha);
  if (!rs.length) return `📅 <b>${titulo}</b>\nNo hay servicios agendados.`;
  const ingreso = rs.reduce((a, r) => a + r.precio, 0);
  const lineas = rs.map(
    (r) => `<b>${r.inicio}</b>–${r.fin} · ${esc(r.servicio)}\n     ${esc(r.cliente)}${r.vehiculo ? ` (${esc(r.vehiculo)})` : ""} · Bahía ${r.bahia}${r.folio ? ` · folio ${r.folio}` : ""}`,
  );
  return `📅 <b>${titulo}</b> — ${rs.length} servicios · ${pesos(ingreso)}\n\n${lineas.join("\n")}`;
}

const AGENDAR = `🗓️ <b>Agendar servicio</b> en ${esc(NEGOCIO)}

${SERVICIOS.map((s) => `• ${esc(s.nombre)} — ${s.min >= 60 ? `${s.min / 60} h` : `${s.min} min`} · ${pesos(s.precio)}`).join("\n")}

Dime qué servicio, qué día, a qué hora y para quién. Por ejemplo:
<i>Cambio de aceite para Jorge Salinas mañana a las 11</i>

Si no sabes la hora, pregúntame qué horarios hay libres.`;

const DATOS = `📊 <b>Pregúntale a tus datos</b>
${esc(EMPRESA_FICTICIA)} · últimos 12 meses

Toca una pregunta o escribe la tuya:`;

const tecladoPreguntas = { inline_keyboard: PREGUNTAS.map((p, i) => [{ text: p, callback_data: `q:${i}` }]) };

// ---------- Agente ----------

/** A veces el modelo se va a Markdown aunque se le pida HTML: lo traducimos al subconjunto de Telegram. */
function aHtml(t: string) {
  return t
    .replace(/&(?!(amp|lt|gt|quot);)/g, "&amp;")
    .replace(/<(?!\/?(b|i|u|s|code)>)/g, "&lt;")
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/(^|\s)__(.+?)__(?=\s|$)/g, "$1<b>$2</b>")
    .replace(/^#{1,6}\s+(.+)$/gm, "<b>$1</b>")
    .replace(/^\s*[-*]\s+/gm, "• ");
}

async function conAgente(chatId: number, c: Chat, texto: string) {
  await escribiendo(chatId);
  const latido = setInterval(() => escribiendo(chatId), 4500);
  try {
    const r = await conversar(c.historial, texto);
    guardar(c, r.nuevos);
    await enviar(chatId, aHtml(r.texto));
    for (const gr of r.graficas) {
      try {
        await enviarFoto(chatId, await graficaPng(gr));
      } catch (e) {
        console.error("[bot] gráfica falló:", (e as Error).message);
      }
    }
  } catch (e) {
    console.error("[bot] agente falló:", (e as Error).message);
    await enviar(chatId, "😕 No pude responder en este momento. Intenta de nuevo en unos segundos.");
  } finally {
    clearInterval(latido);
  }
}

// ---------- Entrada ----------

interface Update {
  update_id: number;
  message?: { chat: { id: number; type: string }; text?: string };
  callback_query?: { id: string; data?: string; message?: { chat: { id: number } } };
}

const COMANDO: Record<string, keyof typeof BOTONES | "start" | "nueva"> = {
  "/start": "start", "/menu": "start", "/ayuda": "ayuda", "/help": "ayuda",
  "/datos": "datos", "/agendar": "agendar", "/hoy": "hoy", "/manana": "manana", "/cliente": "cliente", "/nueva": "nueva",
};
const BOTON = Object.fromEntries(Object.entries(BOTONES).map(([k, v]) => [v, k as keyof typeof BOTONES]));

async function atender(chatId: number, texto: string) {
  const c = chatDe(chatId);
  const cmd = COMANDO[texto.split(/[\s@]/)[0].toLowerCase()] ?? BOTON[texto];

  if (cmd) c.esperaCliente = false;
  switch (cmd) {
    case "start":
    case "ayuda":
      return enviar(chatId, BIENVENIDA, { reply_markup: TECLADO });
    case "nueva":
      chats.delete(chatId);
      return enviar(chatId, "🧹 Listo, empezamos de cero.", { reply_markup: TECLADO });
    case "datos":
      return enviar(chatId, DATOS, { reply_markup: tecladoPreguntas });
    case "agendar":
      anotar(c, "Quiero agendar un servicio.", AGENDAR);
      return enviar(chatId, AGENDAR);
    case "hoy":
    case "manana": {
      const hoy = ahoraLocal().fecha;
      const t = await listaDia(cmd === "hoy" ? hoy : sumarDias(hoy, 1));
      anotar(c, cmd === "hoy" ? "¿Qué servicios hay hoy?" : "¿Qué servicios hay mañana?", t);
      return enviar(chatId, t);
    }
    case "cliente":
      c.esperaCliente = true;
      return enviar(chatId, "👤 ¿De qué cliente? Escribe su nombre (o parte de él).");
  }

  if (c.esperaCliente) {
    c.esperaCliente = false;
    return conAgente(chatId, c, `¿Qué servicios tiene o pidió el cliente "${texto}" y cuándo?`);
  }
  return conAgente(chatId, c, texto);
}

/** Procesa un update de Telegram. Serializado por chat para que el historial no se cruce. */
export async function procesar(u: Update) {
  if (vistos.has(u.update_id)) return; // Telegram reintenta si tardamos
  vistos.add(u.update_id);
  if (vistos.size > 5000) vistos.clear();

  let chatId: number | undefined;
  let texto = "";
  if (u.callback_query) {
    await responderBoton(u.callback_query.id);
    chatId = u.callback_query.message?.chat.id;
    const m = /^q:(\d)$/.exec(u.callback_query.data ?? "");
    if (m && PREGUNTAS[Number(m[1])]) texto = PREGUNTAS[Number(m[1])];
  } else if (u.message?.text && u.message.chat.type === "private") {
    chatId = u.message.chat.id;
    texto = u.message.text.trim().slice(0, 800);
  }
  if (!chatId || !texto) return;

  if (!permitido(`tg:${chatId}`, 40, 10 * 60 * 1000)) {
    return enviar(chatId, "⏳ Vas muy rápido. Espera un par de minutos y seguimos.").catch(() => {});
  }
  if (u.callback_query) await enviar(chatId, `❓ <i>${esc(texto)}</i>`).catch(() => {});

  const c = chatDe(chatId);
  const id = chatId;
  c.cola = c.cola.then(() => atender(id, texto)).catch((e) => console.error("[bot]", (e as Error).message));
  return c.cola;
}
