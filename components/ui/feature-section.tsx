"use client";

import * as React from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FeatureItem {
  text: string;
  href?: string;
}

interface FeatureCategory {
  icon: React.ReactNode;
  title: string;
  items: FeatureItem[];
}

export interface FeatureGridProps {
  title: React.ReactNode;
  subtitle: string;
  illustrationSrc: string;
  illustrationDarkSrc?: string;
  illustrationAlt?: string;
  categories: FeatureCategory[];
  buttonText: string;
  buttonHref: string;
  className?: string;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 16,
    },
  },
};

export const FeatureGrid = React.forwardRef<HTMLDivElement, FeatureGridProps>(
  (
    {
      title,
      subtitle,
      illustrationSrc,
      illustrationDarkSrc,
      illustrationAlt = "Feature illustration",
      categories,
      buttonText,
      buttonHref,
      className,
    },
    ref,
  ) => {
    return (
      <section
        ref={ref}
        className={cn("w-full max-w-6xl mx-auto py-12 md:py-20 px-4", className)}
      >
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 mb-12">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              {title}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-xl">
              {subtitle}
            </p>
          </div>
          <div className="relative flex-shrink-0">
            <img
              src={illustrationSrc}
              alt={illustrationAlt}
              className={cn(
                "h-36 w-64 object-contain drop-shadow-[0_18px_24px_rgba(8,19,32,0.12)] md:h-44 md:w-80 lg:h-48 lg:w-96",
                illustrationDarkSrc && "has-dark-feature-image",
              )}
            />
            {illustrationDarkSrc ? (
              <img
                src={illustrationDarkSrc}
                alt=""
                aria-hidden="true"
                className="feature-highlight-image-dark h-36 w-64 object-contain drop-shadow-[0_18px_34px_rgba(163,230,53,0.12)] md:h-44 md:w-80 lg:h-48 lg:w-96"
              />
            ) : null}
          </div>
        </div>

        <motion.div
          data-feature-grid-card
          className="text-foreground"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={containerVariants}
        >
          <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category, index) => (
              <motion.div
                key={category.title || index}
                variants={itemVariants}
                className="flex flex-col items-start"
              >
                <div className="mb-3 text-green">{category.icon}</div>
                <h3 className="font-semibold text-foreground mb-2">
                  {category.title}
                </h3>
                <ul className="flex flex-col gap-1.5 text-muted-foreground">
                  {category.items.map((item, itemIndex) => (
                    <li key={`${category.title}-${item.text}-${itemIndex}`}>
                      {item.href ? (
                        <a
                          href={item.href}
                          className="hover:text-green hover:underline underline-offset-2 transition-colors"
                        >
                          {item.text}
                        </a>
                      ) : (
                        <span>{item.text}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <motion.div
              variants={itemVariants}
              className="mt-12"
            >
              <Button asChild size="lg" className="px-6">
                <a href={buttonHref}>{buttonText}</a>
              </Button>
          </motion.div>
        </motion.div>
      </section>
    );
  },
);

FeatureGrid.displayName = "FeatureGrid";
