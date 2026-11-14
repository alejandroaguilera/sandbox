"use client";
import { usePathname } from "next/navigation";

// El pie general es del workshop; /cursoIA pone el suyo (con el cliente de la sesión).
export function Pie() {
  const ruta = usePathname();
  if (ruta?.startsWith("/cursoIA")) return null;
  return <footer className="pie">MrHapps · Workshop Coparmex Nuevo Laredo</footer>;
}
