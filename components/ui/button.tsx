"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { getGlowVars, spotlightSurfaceClassName, useSpotlightPointer } from "@/components/ui/spotlight-card";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-[5px] border border-[var(--color-border)] font-medium shadow-[2px_2px_0px_var(--color-shadow)] transition-all hover:translate-y-[2px] hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-accent-primary)] text-[var(--color-on-accent)] hover:opacity-90",
        destructive:
          "bg-[var(--color-negative-text)] text-[var(--color-bg-card)] hover:opacity-90",
        outline:
          "bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-hover-soft)]",
        secondary:
          "bg-[var(--color-bg-card)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]",
        ghost:
          "border-transparent bg-transparent text-[var(--color-text-primary)] shadow-none hover:bg-[var(--color-hover-soft)]",
        link: "border-transparent bg-transparent text-[var(--color-accent-primary)] shadow-none underline-offset-4 hover:translate-y-0 hover:underline",
      },
      size: {
        default: "h-11 px-5 text-sm",
        sm: "h-9 px-3 text-sm",
        lg: "min-h-14 px-8 py-4 text-base",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, style, ...props }, ref) => {
    useSpotlightPointer();

    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        data-glow
        style={{ ...getGlowVars("green"), ...style }}
        className={cn(spotlightSurfaceClassName, buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
