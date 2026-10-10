import type { Metadata } from "next";
import { Qr } from "@/components/Qr";
import { esAdmin } from "@/lib/admin";
import Gastos from "./Gastos";

export const metadata: Metadata = { title: "Demo 2 · Tickets a gastos" };
export const dynamic = "force-dynamic";

export default async function Page() {
  return (
    <div className="proyector">
      <div className="encabezado">
        <div>
          <h1>Del ticket al registro de gastos</h1>
          <p className="sub">Foto → IA → fila clasificada. Sin capturar a mano.</p>
        </div>
        <Qr ruta="/demo/gastos/subir" titulo="Sube desde el celular" />
      </div>
      <Gastos admin={await esAdmin()} />
    </div>
  );
}
