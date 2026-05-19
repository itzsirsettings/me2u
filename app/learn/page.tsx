"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  const [selectedLesson, setSelectedLesson] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [mounted, isLoading, isAuthenticated, router]);

  const activeLesson = financialEducationLessons[selectedLesson];
  const completionPercent = useMemo(
    () => Math.round((completedLessons.length / financialEducationLessons.length) * 100),
    [completedLessons.length],
  );

  if (!mounted || (!isAuthenticated && !isLoading)) return null;

  return (
    <main className="app-mobile-screen mx-auto w-full max-w-md px-3.5 pt-[4.85rem] md:max-w-5xl md:px-6 md:py-24">
      <div className="mb-4 md:mb-8">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
          Me2U Learn
        </p>
        <h1 className="mt-1 text-2xl font-display font-black leading-none tracking-normal md:text-5xl">
          Borrow wisely, build trust.
        </h1>
      </div>

      <section className="grid gap-4 md:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="grid gap-4">
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

          <div className="grid gap-2">
            {financialEducationLessons.map((lesson, index) => {
              const completed = completedLessons.includes(lesson.title);
              const active = selectedLesson === index;

              return (
                <button
                  key={lesson.title}
                  type="button"
                  className={`flex min-w-0 items-center justify-between gap-3 rounded-[8px] border p-3 text-left transition active:scale-[0.99] ${
                    active
                      ? "border-[var(--color-accent-primary)] bg-[var(--mobile-surface)]"
                      : "border-[var(--color-border)] bg-[var(--mobile-surface-muted)]"
                  }`}
                  onClick={() => setSelectedLesson(index)}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">{lesson.title}</span>
                    <span className="mt-1 block truncate text-xs font-semibold text-[var(--color-text-secondary)]">
                      {lesson.duration}
                    </span>
                  </span>
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                    completed ? "bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]" : "bg-[var(--mobile-surface)] text-[var(--color-text-secondary)]"
                  }`}>
                    <Icons8Icon name={completed ? "check" : "book"} size={17} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <article className="mobile-soft-card min-w-0 p-5 md:p-6">
          <div className="mb-5 flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
                Lesson {selectedLesson + 1}
              </p>
              <h2 className="mt-2 text-2xl font-display font-black leading-tight tracking-normal">
                {activeLesson.title}
              </h2>
            </div>
            <span className="shrink-0 rounded-full bg-[var(--mobile-surface-muted)] px-3 py-1 text-xs font-black">
              {activeLesson.duration}
            </span>
          </div>

          <div className="rounded-[8px] bg-[var(--mobile-surface-muted)] p-4">
            <p className="text-sm font-black text-[var(--color-text-primary)]">What this helps you do</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              {activeLesson.outcome}
            </p>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              "Keep lending inside Me2U records.",
              "Check every agreement before accepting.",
              "Protect your PINs and login details.",
              "Report pressure, abuse, or suspicious requests.",
            ].map((tip) => (
              <div key={tip} className="flex min-w-0 items-start gap-2 rounded-[8px] border border-[var(--color-border)] p-3">
                <Icons8Icon name="shield" size={16} className="mt-0.5 shrink-0 text-[var(--color-accent-primary)]" />
                <p className="text-xs font-semibold leading-relaxed text-[var(--color-text-secondary)]">{tip}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="btn-ghost min-h-11"
              onClick={() => setSelectedLesson((current) => Math.max(0, current - 1))}
              disabled={selectedLesson === 0}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn-primary min-h-11"
              onClick={() => {
                setCompletedLessons((current) =>
                  current.includes(activeLesson.title) ? current : [...current, activeLesson.title],
                );
                toast.success("Lesson marked complete.");
                setSelectedLesson((current) => Math.min(financialEducationLessons.length - 1, current + 1));
              }}
            >
              Complete
            </button>
          </div>
        </article>
      </section>
    </main>
  );
}
