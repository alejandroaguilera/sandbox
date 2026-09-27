import Link from "next/link";

const TARJETAS = [
  { href: "/sala/en-vivo", num: "Dinámica", titulo: "Sala en vivo", texto: "¿Qué proceso te duele más? Resultados en tiempo real." },
  { href: "/demo/compras", num: "Demo 1", titulo: "Requisición de compra", texto: "De WhatsApp y papelitos a un flujo automático." },
  { href: "/demo/gastos", num: "Demo 2", titulo: "Tickets → gastos", texto: "Tomas foto, la IA lo captura y lo clasifica." },
  { href: "/demo/datos", num: "Demo 3", titulo: "Pregúntale a tus datos", texto: "Respuestas en español, con gráfica." },
  { href: "/material", num: "Para llevar", titulo: "Material", texto: "Láminas y cuadernillo de trabajo." },
];

export default function Hub() {
  return (
    <div className="ancho">
      <p className="gris" style={{ fontSize: 20, fontWeight: 600, margin: "0 0 12px" }}>Sandbox</p>
      <h1 className="hub-titulo">Tecnología que sí le sirve a tu negocio</h1>
      <p className="hub-sub">Demos y dinámicas en vivo del workshop.</p>
      <div className="hub-grid">
        {TARJETAS.map((t) => (
          <Link key={t.href} href={t.href} className="hub-card">
            <span className="num">{t.num}</span>
            <h2>{t.titulo}</h2>
            <p>{t.texto}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
