import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Pie } from "@/components/Pie";

export const metadata: Metadata = {
  title: "Sandbox · MrHapps",
  description: "Tecnología que sí le sirve a tu negocio — Workshop Coparmex Nuevo Laredo",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#000000", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <body>
        <main>{children}</main>
        <Pie />
      </body>
    </html>
  );
}
