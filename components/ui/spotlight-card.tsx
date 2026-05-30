"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type GlowColor = "blue" | "purple" | "green" | "red" | "orange";

interface GlowCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  glowColor?: GlowColor;
  size?: "sm" | "md" | "lg";
  width?: string | number;
  height?: string | number;
  customSize?: boolean;
}

const sizeMap = {
  sm: "w-48 h-64",
  md: "w-64 h-80",
  lg: "w-80 h-96",
};

type GlowStyle = React.CSSProperties & Record<`--${string}`, string | number>;

let pointerListenerCount = 0;
let removePointerListener: (() => void) | undefined;

function installPointerListener() {
  if (typeof window === "undefined") return () => {};

  if (!removePointerListener) {
    const syncPointer = (e: PointerEvent) => {
      const root = document.documentElement;
      root.style.setProperty("--x", e.clientX.toFixed(2));
      root.style.setProperty("--xp", (e.clientX / window.innerWidth).toFixed(2));
      root.style.setProperty("--y", e.clientY.toFixed(2));
      root.style.setProperty("--yp", (e.clientY / window.innerHeight).toFixed(2));
    };

    document.addEventListener("pointermove", syncPointer);
    removePointerListener = () => document.removeEventListener("pointermove", syncPointer);
  }

  pointerListenerCount += 1;

  return () => {
    pointerListenerCount -= 1;
    if (pointerListenerCount <= 0 && removePointerListener) {
      removePointerListener();
      removePointerListener = undefined;
      pointerListenerCount = 0;
    }
  };
}

export function useSpotlightPointer() {
  React.useEffect(() => installPointerListener(), []);
}

export function SpotlightPointer() {
  useSpotlightPointer();
  return null;
}

export function getGlowVars(glowColor: GlowColor = "green"): GlowStyle {
  return {
    "--glow-color": "var(--green)",
    "--glow-highlight": "var(--lime)",
    "--glow-soft": "var(--snow)",
    "--glow-tone": glowColor,
    "--radius": "14",
    "--border": "1",
    "--backdrop": "color-mix(in srgb, var(--green) 8%, transparent)",
    "--backup-border": "var(--backdrop)",
    "--size": "200",
    "--outer": "1",
    "--border-size": "calc(var(--border, 1) * 1px)",
    "--spotlight-size": "calc(var(--size, 150) * 1px)",
  };
}

export const spotlightSurfaceClassName =
  "spotlight-surface relative overflow-hidden";

export const GlowCard = React.forwardRef<HTMLDivElement, GlowCardProps>(
  (
    {
      children,
      className,
      glowColor = "green",
      size = "md",
      width,
      height,
      customSize = false,
      style,
      ...props
    },
    ref,
  ) => {
    useSpotlightPointer();

    const inlineStyles: GlowStyle = {
      ...getGlowVars(glowColor),
      ...(width !== undefined ? { width: typeof width === "number" ? `${width}px` : width } : {}),
      ...(height !== undefined ? { height: typeof height === "number" ? `${height}px` : height } : {}),
      ...style,
    };

    return (
      <div
        ref={ref}
        data-glow
        style={inlineStyles}
        className={cn(
          spotlightSurfaceClassName,
          !customSize && sizeMap[size],
          !customSize && "aspect-[3/4] grid grid-rows-[1fr_auto]",
          "rounded-2xl p-4 shadow-[0_1rem_2rem_-1rem_rgba(8,19,32,0.65)] backdrop-blur-[5px]",
          className,
        )}
        {...props}
      >
        <div data-glow aria-hidden="true" />
        {children}
      </div>
    );
  },
);

GlowCard.displayName = "GlowCard";
