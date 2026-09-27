"use client";
import { useState } from "react";
import SubirTickets, { GastoFila } from "@/components/SubirTickets";

export default function Subir() {
  const [ultimos, setUltimos] = useState<GastoFila[]>([]);
  return (
    <div className="movil">
      <p className="gris" style={{ margin: "0 0 6px", fontSize: 16 }}>Demo 2</p>
      <h1 style={{ fontSize: 32, marginBottom: 12 }}>Sube fotos de tickets</h1>
      <p className="gris" style={{ fontSize: 17, marginBottom: 28 }}>Aparecen en la pantalla en cuanto la IA los lee. Las fotos no se guardan.</p>
      <SubirTickets grande onResultado={(r) => r.gasto && setUltimos((u) => [r.gasto!, ...u].slice(0, 10))} />
      <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 10 }}>
        {ultimos.map((g) => (
          <div key={g.id} className="tarjeta entra" style={{ padding: 16, fontSize: 16 }}>
            {g.origen === "error" ? (
              <span className="rojo">No se pudo leer — capturar a mano</span>
            ) : (
              <>
                <b>{g.proveedor ?? "Sin proveedor"}</b> · {g.total !== null ? `$${g.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : "sin total"}
                <div className="gris">{g.categoria}{g.revisar && <span className="rojo"> · Revisar</span>}</div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
