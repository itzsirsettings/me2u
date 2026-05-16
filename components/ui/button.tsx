import * as React from "react";

type ButtonVariant = "default" | "secondary" | "outline" | "destructive";
type ButtonSize = "default" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-[var(--color-accent-primary)] text-[var(--color-on-accent)] hover:opacity-90",
  secondary: "bg-[var(--color-bg-card)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]",
  outline: "bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-hover-soft)]",
  destructive: "bg-[var(--color-negative-text)] text-[var(--color-bg-card)] hover:opacity-90",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-11 px-5 text-sm",
  lg: "min-h-14 px-8 py-4 text-base",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "default",
      size = "default",
      type = "button",
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={[
        "inline-flex items-center justify-center rounded-[5px] border border-[var(--color-border)] font-medium shadow-[2px_2px_0px_var(--color-shadow)] transition-all hover:translate-y-[2px] hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(" ")}
      {...props}
    />
  ),
);

Button.displayName = "Button";
