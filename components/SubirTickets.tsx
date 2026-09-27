"use client";
import { useRef, useState } from "react";

export interface GastoFila {
  id: string;
  fecha: string | null;
  proveedor: string | null;
  rfc: string | null;
  subtotal: number | null;
  iva: number | null;
  total: number | null;
  categoria: string;
  confianza: number;
  revisar: boolean;
  origen: string;
}

// Reduce la foto en el navegador antes de subirla (menos datos por el hotspot).
async function reducir(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const escala = Math.min(1, 1600 / bmp.width);
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * escala);
    c.height = Math.round(bmp.height * escala);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

export default function SubirTickets({
  grande = false,
  onInicio,
  onResultado,
}: {
  grande?: boolean;
  onInicio?: (n: number) => void;
  onResultado?: (r: { gasto?: GastoFila; sinConexion?: boolean }) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [pendientes, setPendientes] = useState(0);
  const [hechos, setHechos] = useState(0);
  const [error, setError] = useState("");

  async function subir(files: FileList | null) {
    if (!files?.length) return;
    const lista = [...files];
    setError("");
    setHechos(0);
    setPendientes(lista.length);
    onInicio?.(lista.length);
    // De 2 en 2 para que las filas vayan apareciendo una por una.
    const cola = [...lista];
    const trabajador = async () => {
      while (cola.length) {
        const f = cola.shift()!;
        try {
          const fd = new FormData();
          fd.append("imagen", await reducir(f), "ticket.jpg");
          const r = await fetch("/api/gastos/procesar", { method: "POST", body: fd });
          const j = await r.json().catch(() => ({}));
          if (!r.ok && !j.gasto) setError(j.error || "No se pudo subir una imagen");
          onResultado?.(j);
        } catch {
          setError("Sin conexión al subir una imagen");
          onResultado?.({ sinConexion: true });
        } finally {
          setHechos((h) => h + 1);
        }
      }
    };
    await Promise.all([trabajador(), trabajador()]);
    setPendientes(0);
    if (input.current) input.current.value = "";
  }

  const ocupado = pendientes > 0;
  return (
    <div>
      <input ref={input} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => subir(e.target.files)} />
      <button
        type="button"
        className="boton bloque"
        style={grande ? { fontSize: 26, padding: "24px 40px" } : undefined}
        disabled={ocupado}
        onClick={() => input.current?.click()}
      >
        {ocupado ? `Leyendo tickets… ${hechos}/${pendientes}` : "📷  Subir tickets"}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
