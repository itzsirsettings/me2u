"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";

type SuccessStory = {
  id: string;
  title: string;
  story: string;
  amount: number;
  category: string;
  displayName: string;
};

const categoryIcons: Record<string, string> = {
  education: "🎓",
  business: "💼",
  emergency: "🏥",
  family: "👨‍👩‍👧",
  other: "✨",
};

export default function SuccessStoryCarousel() {
  const [stories, setStories] = useState<SuccessStory[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    const loadStories = async () => {
      try {
        const response = await fetch(
          "/api/platform/success-stories?featured=true&limit=10",
          { cache: "no-store" }
        );
        const result = await response.json();

        if (result.ok && result.stories && result.stories.length > 0) {
          setStories(result.stories);
        }
      } catch (error) {
        console.error("Failed to load success stories:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStories();
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
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green" />
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <div className="text-center py-12 bg-secondary/50 rounded-3xl border border-border">
        <Quote className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground font-bold">
          Success stories coming soon
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Be among the first to share your Me2U story
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
            <h3 className="text-2xl md:text-3xl font-black text-card-foreground mb-4 leading-tight">
              {currentStory.title}
            </h3>

            {/* Story Content */}
            <p className="text-lg text-muted-foreground leading-relaxed mb-6 line-clamp-4">
              {currentStory.story}
            </p>

            {/* Amount & Author */}
            <div className="flex items-center justify-between pt-6 border-t border-border">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Loan Amount
                </p>
                <p className="text-2xl font-black text-green">
                  ₦{currentStory.amount.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">Shared by</p>
                <p className="font-bold text-card-foreground">
                  {currentStory.displayName}
                </p>
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
