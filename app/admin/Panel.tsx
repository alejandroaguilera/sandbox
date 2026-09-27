"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  modo: string;
  cache: { listas: number; total: number };
  conteos: { requisiciones: number; gastos: number };
  leads: { id: string; fecha: string; nombre: string; empresa: string; correo: string; whatsapp: string | null; tamano: string; giro: string | null; proceso: string | null; diagnostico: boolean }[];
  sala: { id: string; fecha: string; dimension: string; tamano: string; proceso: string; oculto: boolean }[];
}

const hora = (s: string) => new Date(s).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

export default function Panel({ modo, cache, conteos, leads, sala }: Props) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function post(url: string, body: unknown, confirmar?: string) {
    if (confirmar && !window.confirm(confirmar)) return;
    setOcupado(true);
    setMsg("");
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      setMsg(r.ok ? "✓ Hecho" : j.error || "Error");
      if (r.status === 401) window.location.href = "/admin/login";
      router.refresh();
      return j;
    } finally {
      setOcupado(false);
    }
  }

  const diag = leads.filter((l) => l.diagnostico).length;
  return (
    <div className="ancho admin">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 40 }}>Admin</h1>
        <div className="acciones">
          {msg && <span className="gris">{msg}</span>}
          <button className="boton secundario" onClick={() => router.refresh()}>Actualizar</button>
          <button className="boton secundario" onClick={async () => { await fetch("/api/admin/logout", { method: "POST" }); window.location.href = "/admin/login"; }}>Salir</button>
        </div>
      </div>

      <h2>Demos</h2>
      <div className="tarjeta">
        <div className="acciones" style={{ marginBottom: 16 }}>
          <b>Flujo de compras:</b>
          {(["direct", "n8n"] as const).map((m) => (
            <button key={m} className={`boton ${modo === m ? "" : "secundario"}`} disabled={ocupado || modo === m} onClick={() => post("/api/admin/modo", { modo: m })}>
              {m === "direct" ? "Directo (dentro de la app)" : "n8n"}
            </button>
          ))}
          <span className="gris">Actual: <b style={{ color: "var(--texto)" }}>{modo}</b></span>
        </div>
        <div className="acciones">
          <button className="boton peligro" disabled={ocupado} onClick={() => post("/api/admin/reset", { demo: "compras" }, "¿Reiniciar la demo de compras? Borra requisiciones, correos y eventos (folio vuelve a 1001).")}>
            Reiniciar demo de compras ({conteos.requisiciones})
          </button>
          <button className="boton peligro" disabled={ocupado} onClick={() => post("/api/admin/reset", { demo: "gastos" }, "¿Reiniciar gastos? Borra los tickets procesados.")}>
            Reiniciar gastos ({conteos.gastos})
          </button>
          <button className="boton secundario" disabled={ocupado} onClick={async () => { const j = await post("/api/admin/modo", { accion: "calentar" }); if (j?.ok) setMsg(`Caché de preguntas: ${j.listas}/${j.total}`); }}>
            Calentar Demo 3 ({cache.listas}/{cache.total})
          </button>
        </div>
      </div>

      <h2>Leads ({leads.length}) · {diag} quieren diagnóstico</h2>
      <div className="acciones" style={{ marginBottom: 12 }}>
        <a className="boton" href="/api/admin/leads">Exportar CSV</a>
      </div>
      <div className="tarjeta" style={{ overflowX: "auto", padding: 8 }}>
        <table className="tabla">
          <thead><tr><th>Fecha</th><th>Nombre</th><th>Empresa</th><th>Correo</th><th>WhatsApp</th><th>Tamaño</th><th>Giro</th><th>Proceso</th><th>Diagnóstico</th></tr></thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} className={l.diagnostico ? "fila-diag" : ""}>
                <td className="gris" style={{ whiteSpace: "nowrap" }}>{hora(l.fecha)}</td>
                <td>{l.nombre}</td><td>{l.empresa}</td><td>{l.correo}</td><td>{l.whatsapp ?? ""}</td>
                <td>{l.tamano}</td><td>{l.giro ?? ""}</td><td>{l.proceso ?? ""}</td>
                <td>{l.diagnostico ? <b className="azul">Sí</b> : "No"}</td>
              </tr>
            ))}
            {!leads.length && <tr><td colSpan={9} className="gris">Sin leads todavía</td></tr>}
          </tbody>
        </table>
      </div>

      <h2>Sala ({sala.length})</h2>
      <div className="acciones" style={{ marginBottom: 12 }}>
        <button className="boton peligro" disabled={ocupado} onClick={() => post("/api/admin/sala", { accion: "vaciar" }, "¿Vaciar TODAS las respuestas de la sala? No se puede deshacer.")}>Vaciar sala</button>
      </div>
      <div className="tarjeta" style={{ overflowX: "auto", padding: 8 }}>
        <table className="tabla">
          <thead><tr><th>Hora</th><th>Dimensión</th><th>Tamaño</th><th>Proceso</th><th></th></tr></thead>
          <tbody>
            {sala.map((s) => (
              <tr key={s.id} style={{ opacity: s.oculto ? 0.5 : 1 }}>
                <td className="gris" style={{ whiteSpace: "nowrap" }}>{hora(s.fecha)}</td>
                <td>{s.dimension}</td><td>{s.tamano}</td>
                <td>{s.oculto && <span className="rojo">[oculto] </span>}{s.proceso}</td>
                <td><button className="boton secundario" style={{ padding: "6px 14px", fontSize: 14 }} disabled={ocupado} onClick={() => post("/api/admin/sala", { id: s.id, oculto: !s.oculto })}>{s.oculto ? "Mostrar" : "Ocultar"}</button></td>
              </tr>
            ))}
            {!sala.length && <tr><td colSpan={5} className="gris">Sin respuestas</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
