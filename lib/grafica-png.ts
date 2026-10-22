import sharp from "sharp";
import type { Respuesta } from "./datos";

// La misma gráfica de la Demo 3, dibujada como SVG y convertida a PNG para mandarla por Telegram.
type Grafica = Respuesta["grafica"];

const AZUL = "#2997FF";
const GRIS = "#86868B";
const TEXTO = "#F5F5F7";
const FONDO = "#1c1c1e";
const FUENTE = "DejaVu Sans, Arial, sans-serif";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const corto = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

function fmt(v: number, f: Grafica["formato"]) {
  if (f === "porcentaje") return `${Math.round(v * 10) / 10}%`;
  const abs = Math.abs(v);
  const n = abs >= 1e6 ? `${(v / 1e6).toFixed(1)} M` : abs >= 1e4 ? `${Math.round(v / 1e3).toLocaleString("es-MX")} mil` : Math.round(v).toLocaleString("es-MX");
  return f === "moneda" ? `$${n}` : n;
}

function barras(g: Grafica, W: number) {
  const n = Math.min(g.valores.length, 10);
  const fila = 54;
  const arriba = 90;
  const izq = 300;
  const der = 150;
  const H = arriba + n * fila + 30;
  const max = Math.max(...g.valores.slice(0, n).map(Math.abs), 1);
  let cuerpo = "";
  for (let i = 0; i < n; i++) {
    const v = g.valores[i];
    const y = arriba + i * fila;
    const w = Math.max(4, (Math.abs(v) / max) * (W - izq - der));
    cuerpo += `<text x="${izq - 16}" y="${y + 26}" text-anchor="end" font-size="20" fill="${TEXTO}">${esc(corto(g.etiquetas[i] ?? "", 26))}</text>`;
    cuerpo += `<rect x="${izq}" y="${y + 6}" width="${w}" height="30" rx="8" fill="${AZUL}"/>`;
    cuerpo += `<text x="${izq + w + 12}" y="${y + 28}" font-size="20" font-weight="bold" fill="${TEXTO}">${esc(fmt(v, g.formato))}</text>`;
  }
  return { H, cuerpo };
}

function linea(g: Grafica, W: number) {
  const H = 560;
  const izq = 120;
  const der = 70;
  const arriba = 100;
  const abajo = 70;
  const n = g.valores.length;
  const max = Math.max(...g.valores, 0);
  const min = Math.min(...g.valores, 0);
  const rango = max - min || 1;
  const x = (i: number) => izq + (n === 1 ? 0 : (i / (n - 1)) * (W - izq - der));
  const y = (v: number) => arriba + (1 - (v - min) / rango) * (H - arriba - abajo);
  let cuerpo = "";
  for (let k = 0; k <= 4; k++) {
    const v = min + (rango * k) / 4;
    cuerpo += `<line x1="${izq}" x2="${W - der}" y1="${y(v)}" y2="${y(v)}" stroke="#3a3a3c"/>`;
    cuerpo += `<text x="${izq - 12}" y="${y(v) + 6}" text-anchor="end" font-size="17" fill="${GRIS}">${esc(fmt(v, g.formato))}</text>`;
  }
  const paso = Math.ceil(n / 12);
  g.etiquetas.forEach((e, i) => {
    if (i % paso === 0) cuerpo += `<text x="${x(i)}" y="${H - abajo + 32}" text-anchor="middle" font-size="17" fill="${GRIS}">${esc(corto(e, 10))}</text>`;
  });
  const pts = g.valores.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  cuerpo += `<polyline points="${pts}" fill="none" stroke="${AZUL}" stroke-width="4" stroke-linejoin="round"/>`;
  cuerpo += g.valores.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="5" fill="${AZUL}"/>`).join("");
  return { H, cuerpo };
}

export async function graficaPng(g: Grafica): Promise<Buffer> {
  const W = 1000;
  const { H, cuerpo } = g.tipo === "linea" ? linea(g, W) : barras(g, W);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="${FUENTE}">
<rect width="${W}" height="${H}" fill="${FONDO}"/>
<text x="40" y="54" font-size="28" font-weight="bold" fill="${TEXTO}">${esc(corto(g.titulo, 60))}</text>
${cuerpo}</svg>`;
  return sharp(Buffer.from(svg), { density: 144 }).png().toBuffer();
}
