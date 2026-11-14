import type { Metadata } from "next";
import { CONTENIDO } from "@/lib/curso/contenido";
import Imprimir from "./Imprimir";

export const metadata: Metadata = { title: "Guía de bolsillo · Curso IA desde cero" };

const HERRAMIENTAS = [
  ["ChatGPT", "La más conocida y versátil: texto, imágenes, voz y archivos. Ideal para empezar."],
  ["Gemini", "Integrada a Gmail, Drive y al buscador. Ideal si vives en Google."],
  ["Copilot", "Dentro de Word, Excel, Outlook y Teams. Ideal si vives en Microsoft."],
  ["Claude", "Redacción muy cuidada y documentos largos. Ideal para escribir y leer mucho."],
];
const SEMAFORO: [string, string, string[]][] = [
  ["verde", "Adelante", ["Correos y documentos", "Excel y reportes", "Minutas, contratos y manuales", "Información pública"]],
  ["amarillo", "Ajusta esto", ["Mejor la cuenta de la empresa", "Desactiva el entrenamiento", "Nada de enlaces públicos", "Revisa antes de enviarlo fuera"]],
  ["rojo", "Nunca", ["Contraseñas y accesos", "Datos sensibles", "Datos bancarios y de tarjetas", "Apps de IA desconocidas"]],
];
const REGLAS = [
  ["Verifica antes de enviar.", "Cifras, fechas, nombres y leyes: siempre."],
  ["Tú firmas, tú respondes.", "“Lo hizo la IA” nunca es excusa."],
  ["Pregunta qué está permitido.", "Con información de trabajo, usa las herramientas que autorice la empresa."],
];

// La guía de bolsillo: la fórmula, las herramientas y el semáforo en una página (se imprime en una hoja carta).
export default function Guia() {
  const { pasos } = CONTENIDO.constructor;
  return (
    <div className="c-guia">
      <span className="c-eyebrow">Guía de bolsillo</span>
      <h1>Inteligencia artificial desde cero</h1>
      <p className="c-sub">La IA propone. Tú decides.</p>

      <h2>La fórmula: cuatro preguntas antes de escribir</h2>
      <div className="c-guia-grid">
        {pasos.map((p, i) => <div key={p.id}><b>{i + 1}. {p.nombre}</b><small>{p.pregunta}</small><small style={{ marginTop: 6 }}>“{p.ejemplo}”</small></div>)}
      </div>

      <h2>Después, conversa: la primera respuesta es un borrador</h2>
      <blockquote>{CONTENIDO.repreguntas.map((r) => `“${r}.”`).join(" · ").replace(/\?\./g, "?")} <span className="gris">La tercera, normalmente, es la buena.</span></blockquote>

      <h2>El mejor truco</h2>
      <blockquote>“{CONTENIDO.truco}” <span className="gris">Agrégalo al final de cualquier petición.</span></blockquote>

      <h2>Las herramientas: con una basta para empezar</h2>
      <div className="c-guia-grid">{HERRAMIENTAS.map(([n, d]) => <div key={n}><b>{n}</b><small>{d}</small></div>)}</div>

      <h2>El semáforo: no es qué le das, es en qué cuenta y con qué ajustes</h2>
      <div className="c-guia-grid tres">
        {SEMAFORO.map(([color, nombre, items]) => <div key={color} className={color}><b>● {nombre}</b><ul>{items.map((x) => <li key={x}>{x}</li>)}</ul></div>)}
      </div>

      <h2>Tres reglas para usarla bien</h2>
      <div className="c-guia-grid tres">{REGLAS.map(([t, d], i) => <div key={t}><b>{i + 1}. {t}</b><small>{d}</small></div>)}</div>

      <div style={{ marginTop: 24 }}><Imprimir /></div>
      <footer className="c-pie">MrHapps · Curso IA desde cero · sandbox.mrhapps.mx/cursoIA · @mrhapps</footer>
    </div>
  );
}
