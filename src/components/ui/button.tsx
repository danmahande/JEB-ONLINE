import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-brand text-white hover:bg-brand-dark active:scale-97",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 active:scale-97",
        outline:
          "border border-line bg-white text-ink hover:bg-ink hover:text-white active:scale-97",
        secondary:
          "bg-secondary text-ink hover:bg-secondary/80 active:scale-97",
        ghost:
          "hover:bg-ink hover:text-white active:scale-97",
        link: "text-primary underline-offset-4 hover:underline active:scale-95",
      },
      size: {
        // ms-label drives type (10px caps) — no text-* utilities here, they
        // would be dead weight under the unlayered primitive.
        default: "h-12 px-6 py-3 has-[>svg]:px-5 ms-label",
        sm: "h-10 gap-1.5 px-4 has-[>svg]:px-3 ms-label",
        lg: "h-14 px-8 has-[>svg]:px-6 ms-label",
        icon: "size-12",
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
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
