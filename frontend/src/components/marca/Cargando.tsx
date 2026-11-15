import { cn } from '@/lib/utils'

/** Indicador de carga: un anillo que gira, hecho con CSS. Hereda el color del texto. */
export function Cargando({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block size-5 shrink-0 animate-spin rounded-full border-[3px] border-current border-r-transparent motion-reduce:animate-none',
        className,
      )}
    />
  )
}
