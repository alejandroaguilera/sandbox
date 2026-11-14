import { conectados, dispositivoDe, estadoSesion, json, marcaPresencia } from "@/lib/curso/servidor";
import { MAX_MENSAJES } from "@/lib/curso/ia";

export const dynamic = "force-dynamic";

// Polling de 3 s de celulares, proyector y control. Sale de caché en memoria: no toca la base en cada llamada.
export async function GET(req: Request) {
  const d = dispositivoDe(req);
  const { s, abiertas } = await estadoSesion();
  const pantalla = new URL(req.url).searchParams.get("rol") === "pantalla";
  if (s && !pantalla) marcaPresencia(s.id, d.id);
  return json(
    {
      sesion: s && {
        codigo: s.codigo, cliente: s.cliente, fecha: s.fecha.toISOString(), wifi: s.wifi, momentoId: s.momentoId,
        iaPausada: s.iaPausada, sinIA: s.sinIA, proyector: s.proyector, epoca: s.epoca,
      },
      abiertas,
      conectados: s ? conectados(s.id) : 0,
      maxMensajes: MAX_MENSAJES,
    },
    d,
  );
}
