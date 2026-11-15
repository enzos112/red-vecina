/** Consultas y acciones del portal del comercio. El comercio sale de la sesión. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type CodigoEnCaja, type IngresoDiferidoNuevo, type PropuestaBeneficios, type UsoEnCaja } from '@/lib/api'

export function useConsultarCodigo() {
  return useMutation({ mutationFn: (datos: CodigoEnCaja) => api.canjes.consultar(datos) })
}

export function useUsarCodigo() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (datos: UsoEnCaja) => api.canjes.usar(datos),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['comercio', 'cupo'] }),
  })
}

export function useDiferidosDeHoy() {
  return useQuery({ queryKey: ['comercio', 'diferidos'], queryFn: api.canjes.misDiferidos })
}

export function useIngresarDiferido() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (datos: IngresoDiferidoNuevo) => api.canjes.diferido(datos),
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: ['comercio', 'diferidos'] })
      cliente.invalidateQueries({ queryKey: ['comercio', 'cupo'] })
    },
  })
}

export function useCupo() {
  return useQuery({ queryKey: ['comercio', 'cupo'], queryFn: api.equilibrio.cupo })
}

export function useAgregarExtra() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (monto: number) => api.equilibrio.extra({ monto }),
    onSuccess: (cupo) => cliente.setQueryData(['comercio', 'cupo'], cupo),
  })
}

export function useMisBeneficios() {
  return useQuery({ queryKey: ['comercio', 'beneficios'], queryFn: api.comercios.misBeneficios })
}

export function useProponer() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (datos: PropuestaBeneficios) => api.comercios.proponer(datos),
    onSuccess: (b) => cliente.setQueryData(['comercio', 'beneficios'], b),
  })
}

export function useReporte() {
  return useQuery({ queryKey: ['comercio', 'reporte'], queryFn: api.reportes.reporte })
}
