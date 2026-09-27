import type { Metadata } from "next";
import { Qr } from "@/components/Qr";
import EnVivo from "./EnVivo";

export const metadata: Metadata = { title: "Sala en vivo · Sandbox" };

export default function Page() {
  return (
    <div className="proyector">
      <div className="encabezado">
        <div>
          <h1>¿Qué proceso te duele más?</h1>
          <p className="sub">Resultados en vivo de la sala</p>
        </div>
        <Qr ruta="/sala" titulo="Contesta aquí" />
      </div>
      <EnVivo />
    </div>
  );
}
