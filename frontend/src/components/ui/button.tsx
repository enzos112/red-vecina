import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

/**
 * Botón de Red Vecina: píldora de color plano. Al pasar el cursor o tocar solo cambia el
 * color de fondo (200 ms); sin sombras ni saltos de tamaño.
 *
 * Variantes: default (principal sobre fondo claro), secondary, oscuro (principal sobre
 * fondo oscuro), oscuro-secundario, destructive (peligro), outline, ghost y link.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent text-base font-bold whitespace-nowrap transition-colors duration-200 ease-out outline-none select-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive motion-reduce:transition-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: "bg-vecina text-white hover:bg-vecina-oscuro active:bg-barrio",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secundario-hover active:bg-secundario-activo aria-expanded:bg-secundario-hover",
        oscuro:
          "bg-mango text-barrio hover:bg-mango-oscuro active:bg-mango-activo focus-visible:outline-mango",
        "oscuro-secundario":
          "border-crema/70 bg-transparent text-crema hover:border-crema hover:bg-barrio-claro active:bg-barrio-activo focus-visible:outline-mango",
        destructive:
          "bg-peligro-oscuro text-white hover:bg-peligro-hover active:bg-peligro-activo focus-visible:outline-peligro",
        outline:
          "border-input bg-card text-foreground hover:border-tinta/40 hover:bg-muted aria-expanded:bg-muted",
        ghost:
          "text-foreground hover:bg-muted aria-expanded:bg-muted",
        link: "h-auto! min-h-12 rounded-sm px-0! text-vecina underline underline-offset-4 hover:text-vecina-oscuro",
      },
      size: {
        default:
          "h-13 gap-2 px-7 has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5 md:h-12",
        sm: "h-12 gap-2 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        xs: "h-12 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        lg: "h-14 gap-2 px-8 text-lg has-data-[icon=inline-end]:pr-6 has-data-[icon=inline-start]:pl-6",
        icon: "size-12",
        "icon-xs": "size-12",
        "icon-sm": "size-12",
        "icon-lg": "size-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
