"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { TargetAndTransition, Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/spotlight-card";

interface FeatureHighlightCardProps {
  id?: string;
  imageSrc: string;
  imageDarkSrc?: string;
  imageAlt?: string;
  imageVariant?: "cover" | "transparent";
  title: string;
  description: string;
  buttonText: string;
  buttonHref?: string;
  className?: string;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const imageContainerVariants: Variants = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

function getIllustrationMotion(id?: string): TargetAndTransition {
  switch (id) {
    case "deposit":
      return {
        y: [0, -8, 0],
        rotate: [0, -0.7, 0],
        scale: [1, 1.012, 1],
        transition: { duration: 5.6, repeat: Infinity, ease: "easeInOut" as const, delay: 0.15 },
      };
    case "marketplace":
      return {
        y: [0, 7, 0],
        rotate: [0, 0.55, 0],
        scale: [1, 1.01, 1],
        transition: { duration: 6.1, repeat: Infinity, ease: "easeInOut" as const, delay: 0.55 },
      };
    case "direct-loans":
      return {
        y: [0, -6, 0],
        rotate: [0, 0.7, 0],
        scale: [1, 1.014, 1],
        transition: { duration: 5.9, repeat: Infinity, ease: "easeInOut" as const, delay: 0.95 },
      };
    default:
      return {
        y: [0, -6, 0],
        scale: [1, 1.01, 1],
        transition: { duration: 5.8, repeat: Infinity, ease: "easeInOut" as const },
      };
  }
}

export const FeatureHighlightCard = React.forwardRef<
  HTMLDivElement,
  FeatureHighlightCardProps
>(
  (
    {
      imageSrc,
      imageDarkSrc,
      imageAlt = "Feature image",
      imageVariant = "cover",
      title,
      description,
      buttonText,
      buttonHref = "/register",
      className,
      id,
    },
    ref,
  ) => {
    const shouldReduceMotion = useReducedMotion();
    const shouldAnimateIllustration = imageVariant === "transparent" && !shouldReduceMotion;

    return (
      <motion.div
        id={id}
        ref={ref}
        className={cn("h-full w-full max-w-lg", className)}
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        whileHover={shouldReduceMotion ? undefined : { y: -6 }}
        transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
        viewport={{ once: true, amount: 0.25 }}
      >
        <GlowCard
          customSize
          glowColor="green"
          className="flex h-full w-full flex-col rounded-2xl border border-[var(--color-border)] bg-card p-6 text-center text-card-foreground shadow-sm md:p-8"
        >
          <div className="absolute left-1/2 top-0 -z-10 h-2/3 w-2/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green/10 blur-3xl" />

          <motion.div variants={imageContainerVariants} className="mb-6 flex justify-center">
            <motion.div
              className="feature-highlight-illustration relative flex w-full justify-center will-change-transform"
              animate={shouldAnimateIllustration ? getIllustrationMotion(id) : undefined}
            >
              <img
                src={imageSrc}
                alt={imageAlt}
                className={cn(
                  "aspect-[4/3] w-full",
                  imageVariant === "transparent"
                    ? "feature-highlight-image-light object-contain drop-shadow-[0_18px_28px_rgba(8,19,32,0.14)]"
                    : "rounded-xl object-cover",
                  imageDarkSrc && "has-dark-feature-image",
                )}
              />
              {imageDarkSrc ? (
                <img
                  src={imageDarkSrc}
                  alt=""
                  aria-hidden="true"
                  className={cn(
                    "feature-highlight-image-dark aspect-[4/3] w-full",
                    imageVariant === "transparent"
                      ? "object-contain drop-shadow-[0_18px_34px_rgba(163,230,53,0.12)]"
                      : "rounded-xl object-cover",
                  )}
                />
              ) : null}
            </motion.div>
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-3xl font-bold tracking-tight text-card-foreground md:text-4xl"
          >
            {title}
          </motion.h2>

          <motion.p variants={itemVariants} className="mt-4 text-base leading-7 text-muted-foreground">
            {description}
          </motion.p>

          <motion.div variants={itemVariants} className="mt-auto pt-8">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <a href={buttonHref}>{buttonText}</a>
            </Button>
          </motion.div>
        </GlowCard>
      </motion.div>
    );
  },
);

FeatureHighlightCard.displayName = "FeatureHighlightCard";
