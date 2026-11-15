import { CalendarX2, History, Receipt, Ticket } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { esTarjetaInexistente, useTarjeta, useToken } from './consultas'
import { FilaHistorial } from './FilaHistorial'
import { armarHistorial, type ItemHistorial } from './historial'
import { CargandoLista, Encabezado, ErrorBloque, TarjetaNoEncontrada, Vacio } from './partes'

const PESTANAS = [
  { valor: 'todo', texto: 'Todo', vacio: 'Aún no tienes movimientos', icono: History },
  { valor: 'compra', texto: 'Compras', vacio: 'Aún no subes boletas', icono: Receipt },
  { valor: 'canje', texto: 'Canjes', vacio: 'Aún no pides códigos', icono: Ticket },
  { valor: 'vencimiento', texto: 'Vencidos', vacio: 'No se te ha vencido ningún punto', icono: CalendarX2 },
] as const

function filtrar(items: ItemHistorial[], valor: (typeof PESTANAS)[number]['valor']) {
  return valor === 'todo' ? items : items.filter((i) => i.tipo === valor)
}

/** /t/:token/historial — compras, canjes y vencimientos. */
export function PaginaHistorial() {
  const token = useToken()
  const tarjeta = useTarjeta(token)

  if (tarjeta.isError && esTarjetaInexistente(tarjeta.error)) return <TarjetaNoEncontrada />

  return (
    <div className="aparecer">
      <Encabezado token={token} titulo="Mi historial" />
      {tarjeta.isPending ? (
        <CargandoLista etiqueta="Cargando tu historial" filas={4} />
      ) : tarjeta.isError ? (
        <ErrorBloque titulo="No pudimos cargar tu historial" error={tarjeta.error} reintentar={() => void tarjeta.refetch()} />
      ) : (
        <Tabs defaultValue="todo">
          <TabsList className="grid w-full grid-cols-2 rounded-3xl">
            {PESTANAS.map((p) => (
              <TabsTrigger key={p.valor} value={p.valor} className="px-3">
                {p.texto}
              </TabsTrigger>
            ))}
          </TabsList>
          {PESTANAS.map((p) => {
            const items = filtrar(armarHistorial(tarjeta.data), p.valor)
            return (
              <TabsContent key={p.valor} value={p.valor} className="mt-4">
                {items.length === 0 ? (
                  <Vacio icono={p.icono} titulo={p.vacio}>
                    {p.valor === 'vencimiento'
                      ? 'Si tienes puntos por vencer, lo verás en tu tarjeta.'
                      : 'Cuando ocurra, lo verás aquí.'}
                  </Vacio>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {items.map((item) => (
                      <FilaHistorial key={item.clave} item={item} />
                    ))}
                  </ul>
                )}
              </TabsContent>
            )
          })}
        </Tabs>
      )}
    </div>
  )
}
