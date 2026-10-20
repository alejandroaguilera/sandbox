"use client";

export default function Imprimir() {
  return <button className="boton" onClick={() => window.print()}>Imprimir</button>;
}
