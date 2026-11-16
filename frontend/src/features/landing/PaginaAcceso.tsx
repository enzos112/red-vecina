import { Link } from 'react-router'
import { Hoja } from '@/components/marca/libreta'

const OPCIONES = [
  {
    a: '/comercio/login',
    titulo: 'Soy un comercio',
    texto: 'Valida códigos, revisa tu cupo y tus beneficios.',
  },
  {
    a: '/admin/entrar',
    titulo: 'Soy del equipo',
    texto: 'Revisión de boletas, vecinos, comercios y la red.',
  },
]

/** /acceso — elige por dónde entrar. Los vecinos no entran aquí: usan su enlace personal. */
export function PaginaAcceso() {
  return (
    <Hoja viva etiqueta="titulo-acceso" className="py-16 sm:py-24">
      <h1 id="titulo-acceso" className="rotulo max-w-2xl text-[3rem] leading-[1.05] tracking-[-0.035em] text-tapa sm:text-7xl">
        ¿Cómo entras?
      </h1>
      <ul className="mt-12 grid max-w-4xl border-t-2 border-tapa sm:grid-cols-2">
        {OPCIONES.map((o) => (
          <li key={o.a} className="group">
            <Link
              to={o.a}
              className="group flex h-full flex-col border-b-2 border-tapa bg-papel py-8 transition-colors duration-200 hover:bg-papel-hover sm:px-8 sm:group-even:border-l-2"
            >
              <span className="rotulo text-4xl text-tapa decoration-tinta-azul decoration-[3px] underline-offset-[8px] group-hover:underline">
                {o.titulo}
              </span>
              <span className="mt-3 text-lg">{o.texto}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-10 max-w-xl text-lg">
        ¿Eres vecino? No necesitas clave: entra con el enlace personal que te llegó por WhatsApp.
      </p>
    </Hoja>
  )
}
