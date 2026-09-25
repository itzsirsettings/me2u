"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { useEffect, useState } from "react";

type SuccessStory = {
  id: string;
  title: string;
  story: string;
  amount: number;
  category: string;
  displayName: string;
  location?: string;
};

type SuccessStoriesResponse = {
  ok?: boolean;
  stories?: SuccessStory[];
};

const categoryIcons: Record<string, string> = {
  education: "🎓",
  business: "💼",
  emergency: "🏥",
  family: "👨‍👩‍👧",
  other: "✨",
};

type SuccessStoryCarouselProps = {
  fallbackStories?: SuccessStory[];
};

export default function SuccessStoryCarousel({ fallbackStories = [] }: SuccessStoryCarouselProps) {
  const [stories, setStories] = useState<SuccessStory[]>(fallbackStories);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    const loadStories = async () => {
      try {
        const response = await fetch("/api/platform/success-stories?featured=true&limit=7", {
          cache: "no-store",
        });
        const result = (await response.json()) as SuccessStoriesResponse;

        if (result.ok && result.stories && result.stories.length > 0) {
          setStories(result.stories);
        }
      } catch {
        // Stories stay hidden if they cannot be loaded; the empty state below covers it.
      } finally {
        setLoading(false);
      }
    };

    void loadStories();
  }, []);

  useEffect(() => {
    if (stories.length === 0) return;

    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % stories.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [stories.length]);

  const goToPrevious = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + stories.length) % stories.length);
  };

  const goToNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % stories.length);
  };

  if (loading) {
    return (
      <div
        className="rounded-3xl border-2 border-border bg-card p-8 md:p-12"
        aria-hidden="true"
      >
        <div className="h-7 w-28 rounded-full bg-secondary animate-pulse mb-6" />
        <div className="h-10 w-3/4 rounded-lg bg-secondary animate-pulse mb-5" />
        <div className="h-4 w-full rounded bg-secondary animate-pulse mb-2" />
        <div className="h-4 w-5/6 rounded bg-secondary animate-pulse mb-8" />
        <div className="h-px bg-green/10 mb-8" />
        <div className="flex items-center justify-between">
          <div className="h-8 w-36 rounded bg-secondary animate-pulse" />
          <div className="h-6 w-28 rounded bg-secondary animate-pulse" />
        </div>
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <div className="text-center py-14 px-6 bg-secondary/50 rounded-3xl border border-border">
        <Quote className="w-12 h-12 text-green/40 mx-auto mb-4" />
        <p className="text-lg font-semibold text-foreground">
          Stories from our community are on the way
        </p>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          Real experiences from Me2U members, shared only with their permission.
        </p>
      </div>
    );
  }

  const currentStory = stories[currentIndex];

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-3xl border-2 border-border bg-card">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentStory.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="p-8 md:p-12"
          >
            {/* Category Badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-3xl">
                {categoryIcons[currentStory.category] || categoryIcons.other}
              </span>
              <span className="px-3 py-1 rounded-full bg-green/20 text-green text-xs font-bold uppercase tracking-wide">
                {currentStory.category}
              </span>
            </div>

            {/* Quote Icon */}
            <Quote className="w-12 h-12 text-green/20 mb-4" />

            {/* Story Title */}
            <h3 className="landing-h3 mb-4">
              {currentStory.title}
            </h3>

            {/* Story Content */}
            <p className="landing-body mb-6 line-clamp-4">
              {currentStory.story}
            </p>

            {/* Amount & Author */}
            <div className="flex items-center justify-between pt-6 border-t border-border">
              {currentStory.amount > 0 ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Loan Amount</p>
                  <p className="text-2xl font-black text-green">
                    ₦{currentStory.amount.toLocaleString()}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Member testimonial</p>
                  <p className="font-bold text-card-foreground">Shared experience</p>
                </div>
              )}
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">Shared by</p>
                <p className="font-bold text-card-foreground">{currentStory.displayName}</p>
                {currentStory.location && (
                  <p className="text-xs text-muted-foreground">{currentStory.location}</p>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Controls */}
      {stories.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-card border-2 border-border hover:border-green hover:bg-green/10 transition-all flex items-center justify-center shadow-lg"
            aria-label="Previous story"
          >
            <ChevronLeft className="w-6 h-6 text-card-foreground" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-card border-2 border-border hover:border-green hover:bg-green/10 transition-all flex items-center justify-center shadow-lg"
            aria-label="Next story"
          >
            <ChevronRight className="w-6 h-6 text-card-foreground" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {stories.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {stories.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setDirection(index > currentIndex ? 1 : -1);
                setCurrentIndex(index);
              }}
              className={`transition-all rounded-full ${
                index === currentIndex
                  ? "w-8 h-2 bg-green"
                  : "w-2 h-2 bg-border hover:bg-green/50"
              }`}
              aria-label={`Go to story ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
