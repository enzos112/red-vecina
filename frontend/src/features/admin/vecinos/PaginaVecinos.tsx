import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { dia } from '@/lib/formato'
import { useBuscarVecinos } from '../consultas'
import { EstadoLista } from '../partes'

/** /admin/vecinos — buscar por nombre o teléfono. */
export function PaginaVecinos() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [texto, setTexto] = useState(params.get('q') ?? '')
  const q = params.get('q') ?? ''

  useEffect(() => {
    const t = setTimeout(() => {
      const limpio = texto.trim()
      if (limpio !== q) setParams(limpio ? { q: limpio } : {}, { replace: true })
    }, 300)
    return () => clearTimeout(t)
  }, [texto, q, setParams])

  const busqueda = useBuscarVecinos(q)
  const lista = busqueda.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="relative max-w-xl">
        <Input
          className="pl-12"
          placeholder="Busca por nombre o teléfono"
          aria-label="Buscar vecino"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          autoFocus
        />
      </div>

      {busqueda.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : busqueda.isError ? (
        <EstadoLista texto={busqueda.error.message} />
      ) : lista.length === 0 ? (
        <EstadoLista texto={q ? 'No encontramos a nadie con eso.' : 'Aún no hay vecinos inscritos.'} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Se inscribió en</TableHead>
              <TableHead>Desde</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.map((v) => (
              <TableRow key={v.id} className="cursor-pointer" onClick={() => navigate(`/admin/vecinos/${v.id}`)}>
                <TableCell className="font-bold">
                  <a href={`/admin/vecinos/${v.id}`} onClick={(e) => e.preventDefault()} className="hover:underline">
                    {v.nombre}
                  </a>
                </TableCell>
                <TableCell className="tabular-nums">{v.telefono}</TableCell>
                <TableCell>{v.comercio_origen ?? '—'}</TableCell>
                <TableCell>{dia(v.creado_en)}</TableCell>
                <TableCell>
                  <Badge variant={v.estado === 'activo' ? 'exito' : 'secondary'}>{v.estado}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
