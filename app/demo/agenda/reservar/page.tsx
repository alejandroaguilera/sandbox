import type { Metadata } from "next";
import FormReserva from "@/components/FormReserva";
import { NEGOCIO } from "@/lib/agenda-catalogo";

export const metadata: Metadata = { title: "Agenda un servicio · Sandbox" };

export default function Reservar() {
  return (
    <div className="movil">
      <p className="gris" style={{ margin: "0 0 6px", fontSize: 16 }}>Demo 4 · {NEGOCIO}</p>
      <h1 style={{ fontSize: 32, marginBottom: 24 }}>Agenda un servicio</h1>
      <FormReserva />
    </div>
  );
}
