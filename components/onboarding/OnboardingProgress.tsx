"use client";

import { motion } from "framer-motion";
import { Check, Lock } from "lucide-react";

type OnboardingStep = {
  id: string;
  label: string;
  shortLabel: string;
  completed: boolean;
  current: boolean;
  locked: boolean;
};

interface OnboardingProgressProps {
  steps: OnboardingStep[];
}

export default function OnboardingProgress({ steps }: OnboardingProgressProps) {
  const completedCount = steps.filter((s) => s.completed).length;
  const totalCount = steps.length;
  const progressPercent = (completedCount / totalCount) * 100;

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="relative">
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-green to-emerald-400"
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs">
          <span className="text-muted-foreground font-bold">
            Step {completedCount + 1} of {totalCount}
          </span>
          <span className="text-green font-bold">{Math.round(progressPercent)}%</span>
        </div>
      </div>

      {/* Steps List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {steps.map((step, index) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`relative overflow-hidden rounded-xl border-2 p-4 transition-all ${
              step.completed
                ? "border-green bg-green/10"
                : step.current
                  ? "border-blue-500 bg-blue-500/10 animate-pulse"
                  : "border-border bg-card opacity-60"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm ${
                  step.completed
                    ? "bg-green text-white"
                    : step.current
                      ? "bg-blue-500 text-white"
                      : "bg-secondary text-muted-foreground"
                }`}
              >
                {step.completed ? (
                  <Check className="w-5 h-5" />
                ) : step.locked ? (
                  <Lock className="w-5 h-5" />
                ) : (
                  index + 1
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-card-foreground truncate">
                  {step.shortLabel}
                </p>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  {step.label}
                </p>
              </div>
            </div>

            {step.current && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 animate-pulse" />
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
