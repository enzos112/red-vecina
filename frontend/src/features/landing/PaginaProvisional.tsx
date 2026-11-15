import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'

/** Página provisional de la fase 0: confirma que el frontend llega a la API. */
export function PaginaProvisional() {
  const salud = useQuery({ queryKey: ['salud'], queryFn: api.general.salud })

  let estado = 'Consultando la API…'
  let color = 'bg-muted-foreground'
  if (salud.isSuccess && salud.data.estado === 'ok') {
    estado = 'API en línea'
    color = 'bg-green-600'
  } else if (salud.isError) {
    estado = 'API sin conexión'
    color = 'bg-red-600'
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Red Vecina</CardTitle>
          <CardDescription>Fundaciones del proyecto</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="flex items-center gap-3 text-lg font-medium" role="status">
            <span className={`size-3 rounded-full ${color}`} aria-hidden="true" />
            {estado}
          </p>
          {salud.isError && (
            <p className="mt-2 text-muted-foreground">{salud.error.message}</p>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
