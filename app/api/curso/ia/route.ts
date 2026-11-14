import type Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { AVISO_ROJO, gastoHoy, ia, MAX_MENSAJES, MODELO_CURSO, SISTEMA, tieneDatoRojo, TOPE_DIARIO_USD } from "@/lib/curso/ia";
import { conCookie, dispositivoDe, hoyUTC, json, limiteCurso, sesionActiva } from "@/lib/curso/servidor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_CHARS = 4000;
const ESPERA_PRIMER_TOKEN_MS = 20_000;
const ESPERA_TOTAL_MS = 45_000;
const FALLO = "La IA está ocupada. Prueba la misma instrucción en tu app de ChatGPT.";

// Con 600 tokens de salida no hay espacio para razonamiento: se apaga según lo que acepta cada modelo.
function sinRazonar(): { thinking?: Anthropic.MessageCreateParams["thinking"] } {
  if (MODELO_CURSO.startsWith("claude-sonnet-5-5")) return { thinking: { type: "between_tools" } as never };
  if (/^claude-(haiku-5-5|sonnet-5|sonnet-4-6)/.test(MODELO_CURSO)) return { thinking: { type: "disabled" } };
  return {};
}

/**
 * Chat del curso. El navegador manda el historial; aquí NO se guarda ni se registra el contenido:
 * solo conteos (mensajes y tokens) para el límite por dispositivo y el tope diario.
 * Respuestas: texto en streaming, o JSON { tipo: "aviso" | "rojo" | "fallo", mensaje } cuando no hay respuesta de la IA.
 */
export async function POST(req: Request) {
  const d = dispositivoDe(req);
  const aviso = (tipo: string, mensaje: string, extra: object = {}) => json({ tipo, mensaje, ...extra }, d);

  const b = await req.json().catch(() => null);
  const entrada: unknown[] = Array.isArray(b?.mensajes) ? b.mensajes.slice(-20) : [];
  const mensajes: Anthropic.MessageParam[] = [];
  for (const m of entrada as { rol?: string; texto?: string }[]) {
    const texto = String(m?.texto ?? "").trim();
    if (!texto || (m?.rol !== "user" && m?.rol !== "assistant")) continue;
    mensajes.push({ role: m.rol, content: texto.slice(0, MAX_CHARS) });
  }
  while (mensajes.length && mensajes[0].role !== "user") mensajes.shift();
  const ultimo = mensajes.at(-1);
  if (!ultimo || ultimo.role !== "user") return json({ error: "Escribe un mensaje" }, d, 400);
  if (String((entrada.at(-1) as { texto?: string })?.texto ?? "").trim().length > MAX_CHARS)
    return aviso("aviso", "Tu mensaje es muy largo para el sandbox (máximo 4,000 caracteres). Recórtalo o pruébalo en tu app de ChatGPT.");

  const s = await sesionActiva();
  if (!s) return aviso("aviso", "El asistente del curso solo está disponible durante la sesión. Copia tu instrucción y pruébala en tu app de ChatGPT o Gemini.");
  if (s.iaPausada || s.sinIA) return aviso("aviso", "Seguimos con la app de ChatGPT. Copia tu instrucción y pégala allá.");
  if (mensajes.some((m) => m.role === "user" && tieneDatoRojo(m.content as string))) return aviso("rojo", AVISO_ROJO);
  if (!limiteCurso(req, "ia", d.id, 6, 60_000)) return aviso("aviso", "Vas muy rápido. Espera un minuto y vuelve a intentar.");
  if ((await gastoHoy()).usd >= TOPE_DIARIO_USD) return aviso("aviso", "El asistente del sandbox llegó a su tope de hoy. Sigue con tu app de ChatGPT o Gemini.");

  // Aparta el mensaje antes de llamar a la IA (si falla, se devuelve).
  const llave = { sesionId_dispositivo: { sesionId: s.id, dispositivo: d.id } };
  const uso = await prisma.cursoUsoIA.upsert({ where: llave, create: { sesionId: s.id, dispositivo: d.id, mensajes: 1 }, update: { mensajes: { increment: 1 } } });
  const devolver = () => prisma.cursoUsoIA.update({ where: llave, data: { mensajes: { decrement: 1 } } }).catch(() => {});
  if (uso.mensajes > MAX_MENSAJES) {
    await devolver();
    return aviso("aviso", "Ya usaste todos tus mensajes del sandbox. Para usar la IA sin límite, abre tu cuenta de ChatGPT o Gemini.", { restantes: 0 });
  }
  const restantes = MAX_MENSAJES - uso.mensajes;

  const ac = new AbortController();
  let reloj = setTimeout(() => ac.abort(), ESPERA_PRIMER_TOKEN_MS);
  let it: AsyncIterator<Anthropic.MessageStreamEvent>;
  let flujo: ReturnType<Anthropic["messages"]["stream"]>;
  let primero = "";
  const textoDe = (e: Anthropic.MessageStreamEvent) => (e.type === "content_block_delta" && e.delta.type === "text_delta" ? e.delta.text : "");
  try {
    flujo = ia().messages.stream({ model: MODELO_CURSO, max_tokens: 600, system: SISTEMA, messages: mensajes, ...sinRazonar() }, { signal: ac.signal });
    it = flujo[Symbol.asyncIterator]();
    while (!primero) {
      const { value, done } = await it.next();
      if (done) break;
      primero = textoDe(value);
    }
  } catch (e) {
    console.error("[curso-ia] fallo antes de responder:", (e as Error).name, (e as { status?: number }).status ?? "");
  }
  clearTimeout(reloj);
  if (!primero) {
    ac.abort();
    await devolver();
    return aviso("fallo", FALLO, { restantes: restantes + 1 });
  }

  const caracteresEntrada = SISTEMA.length + mensajes.reduce((n, m) => n + (m.content as string).length, 0);
  let caracteresSalida = primero.length;
  let contado = false;
  // Registra solo conteos. Si no hubo cifra oficial (corte o desconexión), se estima por caracteres.
  const contar = async (entradaTok?: number, salidaTok?: number) => {
    if (contado) return;
    contado = true;
    const te = entradaTok ?? Math.ceil(caracteresEntrada / 3);
    const ts = salidaTok ?? Math.ceil(caracteresSalida / 3);
    await Promise.all([
      prisma.cursoUsoIA.update({ where: llave, data: { tokensEntrada: { increment: te }, tokensSalida: { increment: ts } } }),
      prisma.cursoGastoDia.upsert({
        where: { dia: hoyUTC() },
        create: { dia: hoyUTC(), mensajes: 1, tokensEntrada: te, tokensSalida: ts },
        update: { mensajes: { increment: 1 }, tokensEntrada: { increment: te }, tokensSalida: { increment: ts } },
      }),
    ]).catch((e) => console.error("[curso-ia] no se pudo contar el uso:", (e as Error).name));
  };

  const enc = new TextEncoder();
  const cuerpo = new ReadableStream<Uint8Array>({
    async start(ctrl) {
      reloj = setTimeout(() => ac.abort(), ESPERA_TOTAL_MS);
      ctrl.enqueue(enc.encode(primero));
      try {
        while (true) {
          const { value, done } = await it.next();
          if (done) break;
          const t = textoDe(value);
          if (t) {
            caracteresSalida += t.length;
            ctrl.enqueue(enc.encode(t));
          }
        }
        const final = await flujo.finalMessage();
        const u = final.usage;
        await contar(u.input_tokens + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0), u.output_tokens);
      } catch (e) {
        console.error("[curso-ia] respuesta cortada:", (e as Error).name);
        await contar();
      } finally {
        clearTimeout(reloj);
        try { ctrl.close(); } catch {}
      }
    },
    async cancel() {
      ac.abort();
      await contar();
    },
  });
  return conCookie(
    new Response(cuerpo, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no", "X-Curso-Restantes": String(restantes) },
    }),
    d,
  );
}
