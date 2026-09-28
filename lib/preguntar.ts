import { responderDatos } from "./ai";
import { agregados, precalculada, preguntaParecida, PREGUNTAS, Respuesta } from "./datos";

// En globalThis: instrumentation.ts (warm-up) y las rutas se empaquetan por separado y no comparten módulos.
const g = globalThis as unknown as { __sbxCache?: Map<number, Respuesta>; __sbxEnCurso?: Map<number, Promise<Respuesta | null>> };
const cache = (g.__sbxCache ??= new Map<number, Respuesta>());
const enCurso = (g.__sbxEnCurso ??= new Map<number, Promise<Respuesta | null>>());

function indiceExacto(q: string) {
  const n = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ¿?¡!]/g, "").trim();
  return PREGUNTAS.findIndex((p) => n(p) === n(q));
}

async function conIA(q: string): Promise<Respuesta | null> {
  const datos = await agregados();
  for (let intento = 0; intento < 2; intento++) {
    try {
      return { ...(await responderDatos(q, datos)), origen: "ia" };
    } catch (e) {
      console.error(`[datos] intento ${intento + 1} falló:`, (e as Error).message);
    }
  }
  return null;
}

export async function preguntar(q: string): Promise<Respuesta> {
  const idx = indiceExacto(q);
  if (idx >= 0) {
    const c = cache.get(idx);
    if (c) return { ...c, origen: "cache" };
    const r = await calentarUna(idx);
    if (r) return r;
  } else {
    const r = await conIA(q);
    if (r) return r;
  }
  return precalculada(idx >= 0 ? idx : preguntaParecida(q), await agregados());
}

function calentarUna(idx: number) {
  let p = enCurso.get(idx);
  if (!p) {
    p = conIA(PREGUNTAS[idx]).then((r) => {
      if (r) cache.set(idx, r);
      enCurso.delete(idx);
      return r;
    });
    enCurso.set(idx, p);
  }
  return p;
}

export async function calentar() {
  if (!process.env.ANTHROPIC_API_KEY) return { listas: 0, total: PREGUNTAS.length };
  await Promise.all(PREGUNTAS.map((_, i) => (cache.has(i) ? null : calentarUna(i))));
  return { listas: cache.size, total: PREGUNTAS.length };
}

export function estadoCache() {
  return { listas: cache.size, total: PREGUNTAS.length };
}
