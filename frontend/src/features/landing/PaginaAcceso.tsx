import { Link } from 'react-router'
import { Contenedor } from './partes'

const OPCIONES = [
  {
    a: '/comercio/login',
    titulo: 'Soy un comercio',
    texto: 'Valida códigos, revisa tu cupo y tus beneficios.',
    barra: 'bg-mango',
  },
  {
    a: '/admin/entrar',
    titulo: 'Soy del equipo',
    texto: 'Revisión de boletas, vecinos, comercios y la red.',
    barra: 'bg-vecina',
  },
]

/** /acceso — elige por dónde entrar. Los vecinos no entran aquí: usan su enlace personal. */
export function PaginaAcceso() {
  return (
    <Contenedor className="py-20 sm:py-28">
      <p className="text-sm font-bold tracking-wide text-vecina uppercase">Acceso</p>
      <h1 className="mt-3 max-w-2xl text-4xl font-extrabold tracking-tight sm:text-6xl">¿Cómo entras?</h1>
      <ul className="mt-12 grid max-w-4xl gap-5 sm:grid-cols-2">
        {OPCIONES.map((o) => (
          <li key={o.a}>
            <Link
              to={o.a}
              className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card p-7 transition-colors duration-200 hover:border-tinta/40 sm:p-9"
            >
              <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1.5 ${o.barra}`} />
              <span className="text-3xl font-extrabold tracking-tight group-hover:underline group-hover:underline-offset-4">
                {o.titulo}
              </span>
              <span className="mt-3 text-muted-foreground">{o.texto}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-10 max-w-xl text-muted-foreground">
        ¿Eres vecino? No necesitas clave: entra con el enlace personal que te llegó por WhatsApp.
      </p>
    </Contenedor>
  )
}
