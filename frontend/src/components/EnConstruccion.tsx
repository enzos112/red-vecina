import { Hammer } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  titulo: string
  descripcion: string
}

/** Pantalla provisional de una zona cuyo contenido llega en una fase siguiente. */
export function EnConstruccion({ titulo, descripcion }: Props) {
  return (
    <Card className="aparecer">
      <CardHeader>
        <span className="mb-2 inline-flex size-12 items-center justify-center rounded-full bg-secondary text-vecina">
          <Hammer className="size-6" aria-hidden="true" />
        </span>
        <CardTitle className="text-2xl">{titulo}</CardTitle>
        <CardDescription>{descripcion}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Esta pantalla está en construcción.</p>
      </CardContent>
    </Card>
  )
}
