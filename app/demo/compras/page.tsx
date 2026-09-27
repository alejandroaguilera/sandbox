import type { Metadata } from "next";
import { Qr } from "@/components/Qr";
import Compras from "./Compras";

export const metadata: Metadata = { title: "Demo 1 · Requisición de compra" };
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="proyector" style={{ fontSize: 22 }}>
      <div className="encabezado" style={{ marginBottom: 24 }}>
        <div>
          <h1>Requisición de compra, sin WhatsApp</h1>
          <p className="sub">Solicitud → hoja de control → aprobación por correo → aviso. Automático.</p>
        </div>
        <Qr ruta="/demo/compras/solicitar" titulo="Haz una solicitud" />
      </div>
      <Compras />
    </div>
  );
}
