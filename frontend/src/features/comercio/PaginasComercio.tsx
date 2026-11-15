import { EnConstruccion } from '@/components/EnConstruccion'

/** Pantallas del portal del comercio: llegan en la fase 6. */
export function PaginaValidar() {
  return <EnConstruccion titulo="Validar código" descripcion="Ingresa el código del vecino y aplica su beneficio." />
}

export function PaginaCupo() {
  return <EnConstruccion titulo="Tu cupo" descripcion="Cupo de la semana: usado, reservado y libre." />
}

export function PaginaBeneficios() {
  return <EnConstruccion titulo="Tus beneficios" descripcion="Los beneficios que ofreces a los vecinos de la red." />
}

export function PaginaReporte() {
  return <EnConstruccion titulo="Tu reporte" descripcion="Vecinos inscritos, clientes derivados y canjes." />
}
