import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/** Aviso: bloque de color plano con borde a la izquierda del color de estado. */
const alertVariants = cva(
  "group/alert relative grid w-full gap-1 rounded-lg border border-l-[6px] px-5 py-4 text-left text-base has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-3 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg:not([class*='size-'])]:size-6",
  {
    variants: {
      variant: {
        default: "border-border border-l-vecina bg-card text-card-foreground *:[svg]:text-vecina",
        exito: "border-exito/30 border-l-exito bg-exito-fondo text-tinta *:[svg]:text-exito-texto",
        alerta: "border-alerta/40 border-l-alerta bg-alerta-fondo text-tinta *:[svg]:text-alerta-texto",
        destructive:
          "border-peligro/30 border-l-peligro bg-peligro-fondo text-tinta *:[svg]:text-peligro-texto",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "text-lg font-extrabold group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-base text-pretty text-tinta/85 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-3",
        className
      )}
      {...props}
    />
  )
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("absolute top-3 right-3", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, AlertAction }
