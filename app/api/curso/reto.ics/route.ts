import { baseUrl } from "@/lib/config";
import { CONTENIDO } from "@/lib/curso/contenido";

export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
// Las líneas de un .ics no pasan de 75 octetos: se doblan con salto + espacio.
function doblar(linea: string) {
  const out: string[] = [];
  let actual = "";
  let bytes = 0;
  for (const ch of linea) {
    const n = Buffer.byteLength(ch);
    if (bytes + n > 73) {
      out.push(actual);
      actual = " ";
      bytes = 1;
    }
    actual += ch;
    bytes += n;
  }
  out.push(actual);
  return out.join("\r\n");
}

// 7 recordatorios diarios a las 9:00 (hora local del celular), a partir de ?inicio=AAAA-MM-DD (o de mañana).
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("inicio") ?? "";
  const base = /^\d{4}-\d{2}-\d{2}$/.test(q) ? new Date(`${q}T00:00:00Z`) : new Date(Date.now() + 86_400_000);
  if (isNaN(base.getTime())) return new Response("Fecha inválida", { status: 400 });
  const url = `${baseUrl()}/cursoIA`;
  const sello = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const lineas = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//MrHapps//Curso IA desde cero//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Reto de 7 días con IA"];
  for (const r of CONTENIDO.reto) {
    const dia = new Date(base.getTime() + (r.dia - 1) * 86_400_000).toISOString().slice(0, 10).replace(/-/g, "");
    lineas.push(
      "BEGIN:VEVENT",
      `UID:reto-ia-${dia}-${r.dia}@sandbox.mrhapps.mx`,
      `DTSTAMP:${sello}`,
      `DTSTART:${dia}T090000`,
      `DTEND:${dia}T091500`,
      `SUMMARY:${esc(`Reto IA · Día ${r.dia}: ${r.titulo}`)}`,
      `DESCRIPTION:${esc(`Copia esta instrucción en tu app de ChatGPT o Gemini:\n\n${r.instruccion}\n\nTu reto y todo el material: ${url}`)}`,
      `URL:${url}`,
      "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(`Reto IA · Día ${r.dia}`)}`, "TRIGGER:PT0M", "END:VALARM",
      "END:VEVENT",
    );
  }
  lineas.push("END:VCALENDAR");
  return new Response(lineas.map(doblar).join("\r\n") + "\r\n", {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="reto-7-dias-ia.ics"', "Cache-Control": "no-store" },
  });
}
