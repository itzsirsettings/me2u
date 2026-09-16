"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { X, Lightbulb, ExternalLink } from "lucide-react";
import Link from "next/link";

type TipType = "info" | "success" | "warning" | "tip";

interface ContextualTipProps {
  type?: TipType;
  title: string;
  message: string;
  learnMoreLink?: string;
  learnMoreText?: string;
  dismissible?: boolean;
  className?: string;
}

const typeStyles: Record<TipType, { bg: string; border: string; icon: string }> = {
  info: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    icon: "text-blue-500",
  },
  success: {
    bg: "bg-green/10",
    border: "border-green/30",
    icon: "text-green",
  },
  warning: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    icon: "text-amber-500",
  },
  tip: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    icon: "text-purple-500",
  },
};

export default function ContextualTip({
  type = "tip",
  title,
  message,
  learnMoreLink,
  learnMoreText = "Learn more",
  dismissible = true,
  className = "",
}: ContextualTipProps) {
  const [visible, setVisible] = useState(true);
  const styles = typeStyles[type];

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={`relative rounded-xl border ${styles.bg} ${styles.border} p-4 ${className}`}
      >
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 ${styles.icon}`}>
            <Lightbulb className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-card-foreground text-sm mb-1">
              {title}
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {message}
            </p>
            {learnMoreLink && (
              <Link
                href={learnMoreLink}
                className={`inline-flex items-center gap-1 text-xs font-bold mt-2 ${styles.icon} hover:underline`}
              >
                {learnMoreText}
                <ExternalLink className="w-3 h-3" />
              </Link>
            )}
          </div>
          {dismissible && (
            <button
              onClick={() => setVisible(false)}
              className="flex-shrink-0 p-1 rounded-lg hover:bg-secondary/50 transition-colors"
              aria-label="Dismiss tip"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
