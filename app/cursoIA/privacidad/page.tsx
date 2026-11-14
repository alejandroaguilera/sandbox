import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacidad · Curso IA desde cero" };

export default function Privacidad() {
  return (
    <div className="c-app" style={{ paddingBottom: 40 }}>
      <span className="c-eyebrow">Curso IA desde cero</span>
      <h1 style={{ margin: "4px 0 20px" }}>Privacidad, en corto</h1>
      <div className="c-tarjeta">
        <h3>Qué se guarda</h3>
        <p>Tus votos, las preguntas anónimas para la sala, tus respuestas del semáforo, la evaluación del curso y conteos de uso del asistente (cuántos mensajes, nunca su contenido).</p>
      </div>
      <div className="c-tarjeta">
        <h3>Qué no se guarda</h3>
        <p>Tus conversaciones con la IA ni datos personales. No te pedimos nombre, correo ni teléfono. Tu apodo, tu reto y tu chat se quedan solo en tu celular.</p>
      </div>
      <div className="c-tarjeta">
        <h3>Qué se manda a la IA</h3>
        <p>Lo que escribes en el asistente se procesa con la API de Anthropic (Claude) para generar la respuesta. Anthropic no usa esos datos para entrenar sus modelos. Aun así, aplica el semáforo: nada de contraseñas ni datos bancarios.</p>
      </div>
      <div className="c-tarjeta">
        <h3>Cómo te reconocemos</h3>
        <p>Con una cookie anónima en tu navegador (un número al azar, 30 días). Sirve para que no votes dos veces y para el límite de mensajes. No te identifica como persona.</p>
      </div>
      <div className="c-tarjeta">
        <h3>Responsable</h3>
        <p>Alejandro Aguilera Rivera / MrHapps · <a href="mailto:yo@alejandroaguilera.mx">yo@alejandroaguilera.mx</a></p>
      </div>
      <a className="c-btn sec" href="/cursoIA">Volver al curso</a>
      <footer className="c-pie">MrHapps · Curso IA desde cero</footer>
    </div>
  );
}
