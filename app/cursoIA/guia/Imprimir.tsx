"use client";
export default function Imprimir() {
  return <button className="c-btn no-imprimir" style={{ maxWidth: 320 }} onClick={() => window.print()}>Guardar como PDF o imprimir</button>;
}
