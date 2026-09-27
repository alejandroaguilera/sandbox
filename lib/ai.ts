import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { CATEGORIAS_GASTO } from "./constantes";
import { Agregados, RespuestaSchema } from "./datos";

export const MODELO = process.env.AI_MODEL || "claude-sonnet-5";

let cliente: Anthropic | null = null;
function ia() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY no configurada");
  cliente ??= new Anthropic({ maxRetries: 1 });
  return cliente;
}

export const TicketSchema = z.object({
  fecha: z.string().nullable().describe("Fecha del ticket en formato AAAA-MM-DD, o null si no se lee"),
  proveedor: z.string().nullable(),
  rfc: z.string().nullable(),
  subtotal: z.number().nullable(),
  iva: z.number().nullable(),
  total: z.number().nullable(),
  categoria: z.enum(CATEGORIAS_GASTO),
  confianza: z.number().describe("De 0 a 1: qué tan seguro estás de la lectura completa"),
});
export type Ticket = z.infer<typeof TicketSchema>;

const PROMPT_TICKET = `Eres un asistente contable en México. Lee la foto de un ticket o comprobante de compra y extrae los datos.
- fecha: la fecha de compra (AAAA-MM-DD). Los tickets mexicanos usan DD/MM/AAAA.
- proveedor: nombre comercial del negocio.
- rfc: el RFC del emisor si aparece (12 o 13 caracteres), si no null.
- subtotal, iva, total: en pesos, como números. Si el ticket no desglosa IVA, deja subtotal e iva en null.
- categoria: la que mejor describa el gasto para el negocio.
- confianza: baja (< 0.6) si la imagen está borrosa, cortada o no es un ticket; alta (> 0.85) solo si leíste todo con claridad.
Nunca inventes datos: si algo no se lee, usa null.`;

export async function extraerTicket(jpegBase64: string, signal?: AbortSignal): Promise<Ticket> {
  const res = await ia().messages.parse(
    {
      model: MODELO,
      max_tokens: 2000,
      thinking: { type: "disabled" },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: jpegBase64 } },
            { type: "text", text: PROMPT_TICKET },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(TicketSchema) },
    },
    { signal, timeout: 30_000 },
  );
  if (!res.parsed_output) throw new Error(`Respuesta sin JSON válido (${res.stop_reason})`);
  return res.parsed_output;
}

// Para structured outputs las filas de la tabla van como texto; se valida después con RespuestaSchema.
const RespuestaIA = z.object({
  respuesta: z.string(),
  grafica: RespuestaSchema.shape.grafica,
  tabla: z.object({ columnas: z.array(z.string()), filas: z.array(z.array(z.string())) }).nullable(),
});

const PROMPT_DATOS = `Eres el analista de negocio de una distribuidora (empresa ficticia para una demostración en vivo ante empresarios).
Responde la pregunta del dueño usando ÚNICAMENTE los datos JSON que te doy. No inventes cifras ni clientes; si los datos no alcanzan para responder, dilo con claridad.
Formato:
- respuesta: 2 a 4 renglones en español de México, claro y directo, como le hablarías a un dueño de negocio. Menciona nombres y cifras concretas (pesos redondeados, con separador de miles). Si hay un hallazgo importante (algo que no es obvio), dilo.
- grafica: una sola gráfica que apoye la respuesta. "barras" para comparar (máximo 10 barras, de mayor a menor), "linea" para evolución en el tiempo. valores numéricos sin formato; formato indica cómo mostrarlos ("moneda" en pesos, "porcentaje" como 24.5 = 24.5%, "numero").
- tabla: opcional (o null), máximo 6 filas y 4 columnas, con valores ya formateados como texto.`;

export async function responderDatos(pregunta: string, datos: Agregados, signal?: AbortSignal) {
  const res = await ia().messages.parse(
    {
      model: MODELO,
      max_tokens: 4000,
      thinking: { type: "disabled" },
      system: PROMPT_DATOS,
      messages: [
        {
          role: "user",
          content: `<datos>\n${JSON.stringify(datos)}\n</datos>\n\nPregunta: ${pregunta}`,
        },
      ],
      output_config: { format: zodOutputFormat(RespuestaIA) },
    },
    { signal, timeout: 45_000 },
  );
  if (!res.parsed_output) throw new Error(`Respuesta sin JSON válido (${res.stop_reason})`);
  return RespuestaSchema.parse(res.parsed_output);
}
