"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Icons8Icon from "@/components/Icons8Icon";
import { financialEducationLessons } from "@/lib/product-features";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function LearnPage() {
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isLoading = useStore((state) => state.isLoading);
  const user = useStore((state) => state.user);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [mounted, isLoading, isAuthenticated, router]);

  const completionPercent = useMemo(
    () => Math.round((completedLessons.length / financialEducationLessons.length) * 100),
    [completedLessons.length],
  );

  if (!mounted || (!isAuthenticated && !isLoading)) return null;

  return (
    <main className="app-mobile-screen mx-auto w-full max-w-md px-3.5 pt-[4.85rem] md:max-w-xl md:px-6 md:py-24">
      <div className="mb-4 md:mb-8">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
          Me2U Learn
        </p>
        <h1 className="mt-1 text-2xl font-display font-black leading-none tracking-normal md:text-4xl">
          Borrow wisely, build trust.
        </h1>
      </div>

      <section className="grid gap-4">
        {/* Progress Card */}
        <article className="mobile-soft-card min-w-0 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-black">Your learning progress</p>
              <p className="mt-1 text-xs font-medium text-[var(--color-text-secondary)]">
                {user?.name || "Your profile"} • {completedLessons.length}/{financialEducationLessons.length} lessons
              </p>
            </div>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-accent-primary)]">
              <Icons8Icon name="book" size={23} />
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--mobile-surface-muted)]">
            <div className="h-full rounded-full bg-[var(--color-accent-primary)]" style={{ width: `${completionPercent}%` }} />
          </div>
          <p className="mt-2 text-xs font-bold text-[var(--color-text-secondary)]">
            {completionPercent}% complete
          </p>
        </article>

        {/* Lesson Accordions */}
        <div className="grid gap-3">
          {financialEducationLessons.map((lesson, index) => {
            const completed = completedLessons.includes(lesson.title);
            const isExpanded = expandedIndex === index;

            return (
              <div
                key={lesson.title}
                className={`flex flex-col min-w-0 rounded-[18px] border transition-all ${
                  isExpanded
                    ? "border-[var(--color-accent-primary)] bg-[var(--mobile-surface)] p-4 shadow-[4px_4px_0px_rgba(0,64,107,0.06)]"
                    : "border-[var(--color-border)] bg-[var(--mobile-surface-muted)] p-3 hover:bg-[var(--color-hover-soft)]"
                }`}
              >
                {/* Accordion Header */}
                <button
                  type="button"
                  className="flex min-w-0 w-full items-center justify-between gap-3 text-left focus:outline-none"
                  onClick={() => setExpandedIndex(isExpanded ? null : index)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-[var(--color-text-primary)]">{lesson.title}</span>
                    <span className="mt-1 block text-xs font-semibold text-[var(--color-text-secondary)]">
                      {lesson.duration}
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    {completed && (
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]">
                        <Icons8Icon name="check" size={12} />
                      </span>
                    )}
                    <span className="text-[var(--color-text-secondary)] transition-transform duration-200">
                      <Icons8Icon name={isExpanded ? "visible" : "invisible"} size={16} />
                    </span>
                  </div>
                </button>

                {/* Accordion Content */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 pt-4 border-t border-[var(--color-border)] space-y-4">
                        <div className="rounded-[8px] bg-[var(--mobile-surface-muted)] p-3.5">
                          <p className="text-xs font-black uppercase tracking-wider text-[var(--color-text-secondary)]">What this helps you do</p>
                          <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-primary)]">
                            {lesson.outcome}
                          </p>
                        </div>

                        {/* General tips */}
                        <div className="grid gap-2">
                          <p className="text-xs font-black uppercase tracking-wider text-[var(--color-text-secondary)]">Key Reminders</p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {[
                              "Keep lending inside Me2U records.",
                              "Check agreements before accepting.",
                              "Protect your PINs and login details.",
                              "Report pressure or suspicious requests.",
                            ].map((tip) => (
                              <div key={tip} className="flex min-w-0 items-start gap-2 rounded-[8px] border border-[var(--color-border)] p-2.5">
                                <Icons8Icon name="shield" size={14} className="mt-0.5 shrink-0 text-[var(--color-accent-primary)]" />
                                <p className="text-[11px] font-semibold leading-relaxed text-[var(--color-text-secondary)]">{tip}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex justify-end gap-2 pt-2">
                          {!completed ? (
                            <button
                              type="button"
                              className="btn-primary min-h-[2.5rem] w-full text-xs font-bold"
                              onClick={() => {
                                setCompletedLessons((current) => [...current, lesson.title]);
                                toast.success(`Completed: ${lesson.title}`);
                                if (index < financialEducationLessons.length - 1) {
                                  setExpandedIndex(index + 1);
                                } else {
                                  setExpandedIndex(null);
                                }
                              }}
                            >
                              Mark as Completed
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn-ghost min-h-[2.5rem] w-full text-xs font-bold text-[var(--color-positive-text)]"
                              onClick={() => {
                                setCompletedLessons((current) => current.filter((t) => t !== lesson.title));
                                toast.success("Marked as uncompleted.");
                              }}
                            >
                              Completed (Tap to Undo)
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
