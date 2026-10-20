import type { Metadata } from "next";
import { Qr } from "@/components/Qr";
import Agenda from "./Agenda";

export const metadata: Metadata = { title: "Demo 4 · Agenda de servicios" };
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="proyector proyector-compras">
      <div className="encabezado">
        <div>
          <h1>Agenda de servicios, sin libreta ni llamadas</h1>
          <p className="sub">El cliente ve los horarios libres, reserva y la agenda se llena sola, sin encimar citas.</p>
        </div>
        <Qr ruta="/demo/agenda/reservar" titulo="Agenda un servicio" />
      </div>
      <Agenda />
    </div>
  );
}
