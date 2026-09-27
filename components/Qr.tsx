import QRCode from "qrcode";
import { baseUrl } from "@/lib/config";

export async function Qr({ ruta, titulo, texto }: { ruta: string; titulo: string; texto?: string }) {
  const url = `${baseUrl()}${ruta}`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } });
  return (
    <div className="qr-caja">
      <div className="qr" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="qr-texto">
        <b>{titulo}</b>
        {texto ?? url.replace(/^https?:\/\//, "")}
      </div>
    </div>
  );
}
