import type { Metadata } from "next";
import QRCode from "qrcode";
import { baseUrl } from "@/lib/config";
import { CONTENIDO } from "@/lib/curso/contenido";
import Proyector from "./Proyector";

export const metadata: Metadata = { title: "En vivo · Curso IA desde cero" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const url = `${baseUrl()}/cursoIA`;
  const qr = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } });
  return <Proyector contenido={CONTENIDO} qr={qr} url={url.replace(/^https?:\/\//, "")} />;
}
