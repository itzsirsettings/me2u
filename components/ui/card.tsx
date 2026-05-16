import * as React from "react";

export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = "", ...props }, ref) => (
  <div
    ref={ref}
    className={[
      "rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[4px_4px_0px_var(--color-shadow)]",
      className,
    ].join(" ")}
    {...props}
  />
));

Card.displayName = "Card";
