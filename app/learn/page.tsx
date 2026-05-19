"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Icons8Icon from "@/components/Icons8Icon";
import { financialEducationLessons } from "@/lib/product-features";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

export default function LearnPage() {
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isLoading = useStore((state) => state.isLoading);
  const user = useStore((state) => state.user);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [expandedLesson, setExpandedLesson] = useState<number | null>(null);
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
    <main className="app-mobile-screen mx-auto w-full max-w-md px-3.5 pt-[4.85rem] md:max-w-2xl md:px-6 md:py-24">
      <div className="mb-4 md:mb-8">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
          Me2U Learn
        </p>
        <h1 className="mt-1 text-2xl font-display font-black leading-none tracking-normal md:text-5xl">
          Borrow wisely, build trust.
        </h1>
      </div>

      <article className="mobile-soft-card min-w-0 p-4 mb-6">
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
        <div className="h-2 overflow-hidden rounded-[50px] bg-[var(--mobile-surface-muted)]">
          <div className="h-full rounded-[50px] bg-[var(--color-accent-primary)]" style={{ width: `${completionPercent}%` }} />
        </div>
        <p className="mt-2 text-xs font-bold text-[var(--color-text-secondary)]">
          {completionPercent}% complete
        </p>
      </article>

      <div className="grid gap-4">
        {financialEducationLessons.map((lesson, index) => {
          const completed = completedLessons.includes(lesson.title);
          const isExpanded = expandedLesson === index;

          return (
            <article 
              key={lesson.title} 
              className={`mobile-soft-card min-w-0 overflow-hidden transition-colors ${isExpanded ? 'border-[var(--color-accent-primary)]' : ''}`}
            >
              <button
                type="button"
                className="w-full flex items-center justify-between p-4 text-left focus:outline-none"
                onClick={() => setExpandedLesson(isExpanded ? null : index)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                    completed ? "bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]" : "bg-[var(--mobile-surface-muted)] text-[var(--color-text-secondary)]"
                  }`}>
                    <Icons8Icon name={completed ? "check" : "book"} size={18} />
                  </span>
                  <div className="min-w-0 pr-4">
                    <p className="text-sm font-black truncate text-[var(--color-text-primary)]">{lesson.title}</p>
                    <p className="text-xs font-semibold text-[var(--color-text-secondary)] mt-0.5">{lesson.duration}</p>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  className="shrink-0 text-[var(--color-text-secondary)]"
                >
                  <Icons8Icon name="chevronDown" size={20} />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="px-4 pb-4 pt-1">
                      <div className="rounded-[50px] bg-[var(--mobile-surface-muted)] p-5 mb-4">
                        <p className="text-sm font-black text-[var(--color-text-primary)]">What this helps you do</p>
                        <p className="mt-2 text-xs font-semibold leading-relaxed text-[var(--color-text-secondary)]">
                          {lesson.outcome}
                        </p>
                      </div>

                      <div className="grid gap-2 mb-5">
                        {lesson.tips.map((tip) => (
                          <div key={tip} className="flex min-w-0 items-center gap-3 rounded-[50px] border border-[var(--color-border)] py-3.5 pl-6 pr-5 bg-[var(--mobile-surface)]">
                            <Icons8Icon name="shield" size={16} className="shrink-0 text-[var(--color-accent-primary)]" />
                            <p className="text-xs font-semibold leading-relaxed text-[var(--color-text-secondary)]">{tip}</p>
                          </div>
                        ))}
                      </div>

                      {!completed && (
                        <button
                          type="button"
                          className="btn-primary w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCompletedLessons((current) => [...current, lesson.title]);
                            toast.success("Lesson marked complete.");
                            setExpandedLesson(index + 1 < financialEducationLessons.length ? index + 1 : null);
                          }}
                        >
                          Mark as Complete
                        </button>
                      )}
                      {completed && (
                        <p className="text-center text-sm font-bold text-[var(--color-positive-text)]">
                          ✓ You have completed this lesson.
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </article>
          );
        })}
      </div>
    </main>
  );
}
