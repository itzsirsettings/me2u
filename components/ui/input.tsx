import * as React from "react";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className = "", ...props }, ref) => (
  <input
    ref={ref}
    className={[
      "flex h-12 w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 text-base text-[var(--color-text-primary)] outline-none transition-colors placeholder:text-[var(--color-text-secondary)] focus:ring-2 focus:ring-[var(--color-accent-primary)] disabled:cursor-not-allowed disabled:opacity-50",
      className,
    ].join(" ")}
    {...props}
  />
));

Input.displayName = "Input";
