"use client";
import { useCallback, useEffect, useState } from "react";

export interface Estado {
  sesion: { codigo: string; cliente: string; fecha: string; wifi: string | null; momentoId: string | null; iaPausada: boolean; sinIA: boolean; proyector: string; epoca: number } | null;
  abiertas: string[];
  conectados: number;
  maxMensajes: number;
}

/** Polling del estado de la sesión cada 3 s (se pausa con la pantalla apagada y se retoma al volver). */
export function useEstado(rol?: "pantalla") {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [sinRed, setSinRed] = useState(false);
  useEffect(() => {
    let vivo = true;
    const cargar = async () => {
      if (document.hidden) return;
      try {
        const r = await fetch(`/api/curso/estado${rol ? `?rol=${rol}` : ""}`, { cache: "no-store" });
        if (!r.ok) throw new Error();
        const j = await r.json();
        if (vivo) { setEstado(j); setSinRed(false); }
      } catch {
        if (vivo) setSinRed(true);
      }
    };
    cargar();
    const t = setInterval(cargar, 3000);
    document.addEventListener("visibilitychange", cargar);
    return () => { vivo = false; clearInterval(t); document.removeEventListener("visibilitychange", cargar); };
  }, [rol]);
  return { estado, sinRed };
}

/** Copia al portapapeles: Clipboard API y, si no hay (o falla), selección de texto + execCommand. */
export async function copiar(texto: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = texto;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;font-size:16px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, texto.length);
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

function lee<T>(almacen: "local" | "session", clave: string, inicial: T): T {
  try {
    const v = (almacen === "local" ? localStorage : sessionStorage).getItem(clave);
    return v == null ? inicial : (JSON.parse(v) as T);
  } catch {
    return inicial;
  }
}

/** Estado que vive en el dispositivo (localStorage o sessionStorage). Se lee después de montar para no romper la hidratación. */
export function useGuardado<T>(clave: string, inicial: T, almacen: "local" | "session" = "local") {
  const [valor, setValor] = useState<T>(inicial);
  const [listo, setListo] = useState(false);
  useEffect(() => {
    setValor(lee(almacen, clave, inicial));
    setListo(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);
  const guardar = useCallback(
    (v: T | ((antes: T) => T)) => {
      setValor((antes) => {
        const nuevo = typeof v === "function" ? (v as (a: T) => T)(antes) : v;
        try {
          (almacen === "local" ? localStorage : sessionStorage).setItem(clave, JSON.stringify(nuevo));
        } catch {}
        return nuevo;
      });
    },
    [clave, almacen],
  );
  return [valor, guardar, listo] as const;
}

export async function post(url: string, body: unknown) {
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    return r.ok ? { ok: true as const, ...j } : { ok: false as const, error: (j.error as string) || "No se pudo enviar. Intenta de nuevo." };
  } catch {
    return { ok: false as const, error: "Sin conexión. Intenta de nuevo." };
  }
}

export interface MensajeIA { rol: "user" | "assistant"; texto: string }
export type RespuestaIA = { tipo: "ok" | "aviso" | "rojo" | "fallo"; texto: string; restantes?: number };
const FALLO = "La IA está ocupada. Prueba la misma instrucción en tu app de ChatGPT.";

/** Llama al asistente del curso. La respuesta llega en streaming (alParcial) o como aviso local. */
export async function pedirIA(mensajes: MensajeIA[], alParcial: (texto: string) => void): Promise<RespuestaIA> {
  const ac = new AbortController();
  const reloj = setTimeout(() => ac.abort(), 55_000);
  try {
    const r = await fetch("/api/curso/ia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mensajes }), signal: ac.signal });
    if (!r.ok) return { tipo: "fallo", texto: FALLO };
    if ((r.headers.get("content-type") ?? "").includes("json")) {
      const j = await r.json();
      return { tipo: j.tipo ?? "fallo", texto: j.mensaje ?? FALLO, restantes: typeof j.restantes === "number" ? j.restantes : undefined };
    }
    const restantes = Number(r.headers.get("x-curso-restantes"));
    const lector = r.body!.getReader();
    const dec = new TextDecoder();
    let texto = "";
    while (true) {
      const { value, done } = await lector.read();
      if (done) break;
      texto += dec.decode(value, { stream: true });
      alParcial(texto);
    }
    return texto.trim() ? { tipo: "ok", texto, restantes: Number.isFinite(restantes) ? restantes : undefined } : { tipo: "fallo", texto: FALLO };
  } catch {
    return { tipo: "fallo", texto: FALLO };
  } finally {
    clearTimeout(reloj);
  }
}

export const ETIQUETA_TIPO: Record<string, string> = { demo: "▶ Demo en vivo", ejercicio: "👤 Ejercicio", participa: "💬 Participa", info: "En pantalla" };

/** "0:25" después de la hora de inicio → hora de reloj ("10:25"). */
export function horaBloque(fechaISO: string | undefined, desfase: string) {
  if (!fechaISO) return desfase;
  const [h, m] = desfase.split(":").map(Number);
  const d = new Date(new Date(fechaISO).getTime() + (h * 60 + m) * 60_000);
  return d.toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit", hour12: true }).replace(/\s?([ap])\.?\s?m\.?/i, " $1m");
}
