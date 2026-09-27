import type { Metadata, Viewport } from "next";
import "./globals.css";

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
        <footer className="pie">MrHapps · Workshop Coparmex Nuevo Laredo</footer>
      </body>
    </html>
  );
}
