import { baseUrl } from "./config";

// Cliente mínimo de la Bot API de Telegram (sin dependencias).
const API = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

export const botActivo = () => Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_WEBHOOK_SECRET);

async function llamar(metodo: string, cuerpo: unknown) {
  const r = await fetch(`${API()}/${metodo}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(20_000),
  });
  const j = await r.json().catch(() => ({ ok: false, description: `HTTP ${r.status}` }));
  if (!j.ok) throw new Error(`[telegram] ${metodo}: ${j.description}`);
  return j.result;
}

// ---------- Menú ----------

export const BOTONES = {
  datos: "📊 Pregúntale a tus datos",
  agendar: "🗓️ Agendar servicio",
  hoy: "📅 Servicios de hoy",
  manana: "📆 Servicios de mañana",
  cliente: "👤 Buscar por cliente",
  ayuda: "ℹ️ Ayuda",
} as const;

export const TECLADO = {
  keyboard: [
    [{ text: BOTONES.datos }, { text: BOTONES.agendar }],
    [{ text: BOTONES.hoy }, { text: BOTONES.manana }],
    [{ text: BOTONES.cliente }, { text: BOTONES.ayuda }],
  ],
  resize_keyboard: true,
  is_persistent: true,
  input_field_placeholder: "Pregunta o pide lo que necesites…",
};

const COMANDOS = [
  { command: "menu", description: "Mostrar el menú" },
  { command: "datos", description: "Pregúntale a tus datos" },
  { command: "agendar", description: "Agendar un servicio" },
  { command: "hoy", description: "Servicios de hoy" },
  { command: "manana", description: "Servicios de mañana" },
  { command: "cliente", description: "Buscar servicios de un cliente" },
  { command: "nueva", description: "Empezar una conversación nueva" },
];

/** Registra webhook y comandos. Idempotente: corre en cada arranque. */
export async function configurarBot() {
  if (!botActivo()) return false;
  await llamar("setWebhook", {
    url: `${baseUrl()}/api/telegram`,
    secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: false,
  });
  await llamar("setMyCommands", { commands: COMANDOS, language_code: "es" });
  await llamar("setMyCommands", { commands: COMANDOS });
  await llamar("setChatMenuButton", { menu_button: { type: "commands" } });
  return true;
}

// ---------- Envío ----------

const sinEtiquetas = (s: string) =>
  s.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

/** Telegram limita a 4096 caracteres; se corta por renglones. */
function trozos(texto: string, max = 3900) {
  const out: string[] = [];
  let actual = "";
  for (const linea of texto.split("\n")) {
    if (actual && actual.length + linea.length + 1 > max) {
      out.push(actual);
      actual = "";
    }
    actual = actual ? `${actual}\n${linea}` : linea.slice(0, max);
  }
  if (actual) out.push(actual);
  return out;
}

/** Envía HTML; si Telegram rechaza el marcado (p. ej. un "<" suelto de la IA), reintenta como texto plano. */
export async function enviar(chatId: number, html: string, extra: Record<string, unknown> = {}) {
  const partes = trozos(html.trim() || "…");
  for (let i = 0; i < partes.length; i++) {
    const ultimo = i === partes.length - 1;
    const base = { chat_id: chatId, link_preview_options: { is_disabled: true }, ...(ultimo ? extra : {}) };
    try {
      await llamar("sendMessage", { ...base, text: partes[i], parse_mode: "HTML" });
    } catch (e) {
      if (!/parse|entit|tag/i.test((e as Error).message)) throw e;
      await llamar("sendMessage", { ...base, text: sinEtiquetas(partes[i]) });
    }
  }
}

export async function enviarFoto(chatId: number, png: Buffer, caption?: string) {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  if (caption) form.append("caption", caption.slice(0, 1000));
  form.append("photo", new Blob([new Uint8Array(png)], { type: "image/png" }), "grafica.png");
  const r = await fetch(`${API()}/sendPhoto`, { method: "POST", body: form, signal: AbortSignal.timeout(30_000) });
  const j = await r.json().catch(() => ({ ok: false }));
  if (!j.ok) throw new Error(`[telegram] sendPhoto: ${j.description ?? r.status}`);
}

export const escribiendo = (chatId: number) => llamar("sendChatAction", { chat_id: chatId, action: "typing" }).catch(() => {});

export const responderBoton = (id: string) => llamar("answerCallbackQuery", { callback_query_id: id }).catch(() => {});

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
