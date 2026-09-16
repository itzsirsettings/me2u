"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { GlowCard } from "@/components/ui/spotlight-card";

export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <GlowCard
    ref={ref}
    customSize
    glowColor="green"
    className={cn(
      "rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[4px_4px_0px_var(--color-shadow)]",
      className,
    )}
    {...props}
  />
));

Card.displayName = "Card";
