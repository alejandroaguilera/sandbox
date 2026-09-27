import type { Metadata } from "next";

export const metadata: Metadata = { title: "Aviso de privacidad · Sandbox" };

export default function Privacidad() {
  return (
    <div className="movil" style={{ fontSize: 17, lineHeight: 1.55 }}>
      <h1 style={{ fontSize: 30, marginBottom: 20 }}>Aviso de privacidad simplificado</h1>
      <p>
        <b>Alejandro Aguilera Rivera (MrHapps)</b>, con domicilio en Nuevo Laredo, Tamaulipas, es responsable del tratamiento de los datos
        personales que nos proporcionas en este sitio.
      </p>
      <p>
        <b>¿Para qué usamos tus datos?</b> Para enviarte el material del workshop “Tecnología que sí le sirve a tu negocio” y para darte
        seguimiento comercial (por ejemplo, información sobre el Diagnóstico de Madurez Digital y servicios relacionados).
      </p>
      <p>
        <b>¿Qué datos?</b> Nombre, empresa, correo, WhatsApp (opcional), tamaño y giro de la empresa, y el proceso que nos compartas.
        No pedimos datos sensibles. No vendemos ni compartimos tus datos con terceros.
      </p>
      <p>
        <b>Tus derechos ARCO.</b> Puedes acceder, rectificar, cancelar u oponerte al uso de tus datos, o revocar tu consentimiento,
        escribiendo a <a href="mailto:yo@alejandroaguilera.mx">yo@alejandroaguilera.mx</a>.
      </p>
      <p className="gris">
        Las respuestas de la dinámica “¿Qué proceso te duele más?” son anónimas: no se guarda ningún dato que te identifique.
      </p>
      <p className="gris" style={{ fontSize: 15 }}>Aviso emitido conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares. Última actualización: septiembre de 2026.</p>
    </div>
  );
}
