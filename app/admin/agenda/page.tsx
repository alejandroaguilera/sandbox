import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { esAdmin } from "@/lib/admin";
import { ahoraLocal, resumenAgenda } from "@/lib/agenda";
import { NEGOCIO, etiquetaDia, hhmm, pesos } from "@/lib/agenda-catalogo";
import Imprimir from "./Imprimir";

export const metadata: Metadata = { title: "Resumen de agenda · Admin" };
export const dynamic = "force-dynamic";

const mayus = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

const RANGOS = [
  { dias: 1, nombre: "Hoy" },
  { dias: 7, nombre: "Próximos 7 días" },
  { dias: 30, nombre: "Próximos 30 días" },
];

export default async function ResumenAgendaPage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  if (!(await esAdmin())) redirect("/admin/login");
  const pedido = Number((await searchParams).dias);
  const dias = RANGOS.some((r) => r.dias === pedido) ? pedido : 7;
  const r = await resumenAgenda(dias);
  const ahora = ahoraLocal();
  const horas = (n: number) => n.toLocaleString("es-MX", { maximumFractionDigits: 1 });
  const fechas = r.porDia.filter((d) => d.n > 0);

  return (
    <div className="impresion">
      <div className="no-imprimir impresion-barra">
        <a href="/admin" className="boton secundario">← Admin</a>
        {RANGOS.map((x) => (
          <a key={x.dias} href={`/admin/agenda?dias=${x.dias}`} className={`boton ${x.dias === dias ? "" : "secundario"}`}>{x.nombre}</a>
        ))}
        <Imprimir />
      </div>

      <article className="hoja-imp">
        <header className="imp-cab">
          <div>
            <div className="imp-negocio">{NEGOCIO}</div>
            <h1>Resumen de servicios reservados</h1>
            <div className="imp-rango">{r.desde === r.hasta ? mayus(etiquetaDia(r.desde, true)) : `Del ${etiquetaDia(r.desde, true)} al ${etiquetaDia(r.hasta, true)}`}</div>
          </div>
          <div className="imp-generado">Generado el {etiquetaDia(ahora.fecha)} a las {hhmm(ahora.min)}</div>
        </header>

        <section className="imp-kpis">
          <div><span>Servicios</span><b>{r.total.n}</b></div>
          <div><span>Horas de taller</span><b>{horas(r.total.horas)}</b></div>
          <div><span>Ocupación</span><b>{Math.round(r.total.ocupacion * 100)}%</b></div>
          <div><span>Ingreso estimado</span><b>{pesos(r.total.ingreso)}</b></div>
        </section>

        <div className="imp-dos">
          <section>
            <h2>Por servicio</h2>
            <table className="imp-tabla">
              <thead><tr><th>Servicio</th><th className="num">Reservas</th><th className="num">Horas</th><th className="num">Ingreso</th></tr></thead>
              <tbody>
                {r.porServicio.map((s) => (
                  <tr key={s.nombre}><td>{s.nombre}</td><td className="num">{s.n}</td><td className="num">{horas(s.horas)}</td><td className="num">{pesos(s.ingreso)}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
          {r.porDia.length > 1 && (
            <section>
              <h2>Por día</h2>
              <table className="imp-tabla">
                <thead><tr><th>Día</th><th className="num">Servicios</th><th className="num">Ocupación</th><th className="num">Ingreso</th></tr></thead>
                <tbody>
                  {r.porDia.map((d) => (
                    <tr key={d.fecha}><td>{d.etiqueta}</td><td className="num">{d.n}</td><td className="num">{Math.round(d.ocupacion * 100)}%</td><td className="num">{pesos(d.ingreso)}</td></tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>

        <h2>Detalle</h2>
        {fechas.map((d) => (
          <section key={d.fecha} className="imp-dia">
            <h3>{mayus(etiquetaDia(d.fecha, true))} <span>· {d.n} servicios · {pesos(d.ingreso)}</span></h3>
            <table className="imp-tabla">
              <thead><tr><th>Horario</th><th>Bahía</th><th>Servicio</th><th>Cliente</th><th>Vehículo</th><th>Folio</th><th className="num">Precio</th></tr></thead>
              <tbody>
                {r.filas.filter((f) => f.fecha === d.fecha).map((f) => (
                  <tr key={f.id} className={f.vivo ? "imp-vivo" : ""}>
                    <td className="nowrap">{hhmm(f.inicioMin)}–{hhmm(f.finMin)}</td>
                    <td>{f.bahia}</td>
                    <td>{f.servicio}</td>
                    <td>{f.cliente}</td>
                    <td>{f.vehiculo ?? "—"}</td>
                    <td>{f.folio ?? "—"}</td>
                    <td className="num">{pesos(f.precio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
        {!fechas.length && <p>No hay servicios reservados en este periodo.</p>}
        <footer className="imp-pie">Las filas resaltadas se reservaron en vivo durante la demo. Datos ficticios.</footer>
      </article>
    </div>
  );
}
