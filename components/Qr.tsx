import QRCode from "qrcode";
import { baseUrl } from "@/lib/config";

export async function Qr({ ruta, titulo, texto }: { ruta: string; titulo: string; texto?: string }) {
  const url = `${baseUrl()}${ruta}`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } });
  return (
    <>
      <div className="qr-caja">
        <div className="qr" dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="qr-texto">
          <span className="qr-eyebrow">Escanea con tu celular</span>
          <b>{titulo}</b>
          <span className="qr-url">
            {/* Corta la URL solo en las diagonales, nunca a media palabra. */}
            {(texto ?? url.replace(/^https?:\/\//, "")).split("/").map((t, i) => (
              <span key={i}>{i > 0 && <>/<wbr /></>}{t}</span>
            ))}
          </span>
        </div>
      </div>
      {/* En el celular un QR no sirve: se muestra un botón a la misma ruta. */}
      <a className="boton secundario qr-movil" href={ruta}>{titulo} →</a>
    </>
  );
}
