import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

/**
 * Etiqueta de estado. Las variantes exito, alerta y peligro llevan un punto del color de
 * estado y el texto en su tono oscuro (contraste AA). El color nunca va solo: siempre con texto.
 */
const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-2 overflow-hidden rounded-none border border-transparent px-3 py-1 text-sm font-bold whitespace-nowrap transition-colors duration-200 [&>svg]:pointer-events-none [&>svg]:size-4!",
  {
    variants: {
      variant: {
        default: "bg-tapa text-papel",
        secondary: "bg-secondary text-secondary-foreground",
        mango: "bg-mango text-barrio",
        exito:
          "bg-exito-fondo text-exito-texto before:size-2.5 before:rounded-none before:bg-exito before:content-['']",
        alerta:
          "bg-alerta-fondo text-alerta-texto before:size-2.5 before:rounded-none before:bg-alerta before:content-['']",
        peligro:
          "bg-peligro-fondo text-peligro-texto before:size-2.5 before:rounded-none before:bg-peligro before:content-['']",
        destructive: "bg-peligro-oscuro text-white",
        outline: "border-input bg-card text-foreground",
        ghost: "text-muted-foreground",
        link: "text-vecina underline underline-offset-4",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
