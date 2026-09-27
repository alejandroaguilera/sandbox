import type { Metadata } from "next";
import FormSolicitud from "@/components/FormSolicitud";

export const metadata: Metadata = { title: "Nueva requisición · Sandbox" };

export default function Solicitar() {
  return (
    <div className="movil">
      <p className="gris" style={{ margin: "0 0 6px", fontSize: 16 }}>Demo 1 · Distribuidora Ejemplo del Norte</p>
      <h1 style={{ fontSize: 32, marginBottom: 24 }}>Nueva requisición de compra</h1>
      <FormSolicitud />
    </div>
  );
}
