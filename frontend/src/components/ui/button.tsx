import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

/**
 * Botón de Red Vecina (libreta del almacén): rectángulo de esquinas rectas con borde de tapa.
 * El naranja marca la acción principal; al pasar el cursor solo cambia el color (200 ms).
 *
 * Variantes: default y libreta (principal, naranja), secondary, outline y libreta-secundario
 * (papel con borde de tapa), oscuro (principal sobre la tapa), oscuro-secundario y
 * libreta-tapa (secundario sobre la tapa), destructive, ghost y link.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-none border-2 border-transparent text-base font-extrabold whitespace-nowrap transition-colors duration-200 ease-out outline-none select-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive motion-reduce:transition-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: "border-tapa bg-mango text-tapa hover:bg-mango-oscuro active:bg-mango-activo",
        secondary:
          "border-tapa bg-papel text-tapa hover:bg-papel-hover active:bg-cuadricula aria-expanded:bg-papel-hover",
        oscuro:
          "border-mango bg-mango text-tapa hover:bg-mango-oscuro active:bg-mango-activo focus-visible:outline-mango",
        "oscuro-secundario":
          "border-tapa-texto bg-transparent text-papel hover:border-papel hover:bg-tapa-hover active:bg-barrio-activo focus-visible:outline-mango",
        destructive:
          "bg-peligro-oscuro text-white hover:bg-peligro-hover active:bg-peligro-activo focus-visible:outline-peligro",
        outline:
          "border-tapa bg-papel text-tapa hover:bg-papel-hover aria-expanded:bg-papel-hover",
        ghost:
          "text-tapa hover:bg-papel-hover aria-expanded:bg-papel-hover",
        /* Libreta: rectángulos con borde de tapa. El naranja solo marca lo que se toca. */
        libreta:
          "rounded-none border-tapa bg-mango font-extrabold text-tapa hover:bg-mango-oscuro active:bg-mango-activo",
        "libreta-secundario":
          "rounded-none border-tapa bg-papel font-extrabold text-tapa hover:bg-papel-hover active:bg-cuadricula",
        "libreta-tapa":
          "rounded-none border-tapa-texto bg-transparent font-extrabold text-papel hover:border-papel hover:bg-tapa-hover focus-visible:outline-mango",
        link: "h-auto! min-h-12 px-0! font-bold text-tinta-azul underline decoration-2 underline-offset-[6px] hover:text-tapa",
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
