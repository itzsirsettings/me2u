"use client";

import { useEffect, useState } from "react";

import { ScrollReelTestimonials } from "@/components/ui/scroll-reel-testimonials";

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

type SuccessStoryCarouselProps = {
  fallbackStories?: SuccessStory[];
};

const portraits = [
  { id: "chinedu-okafor", src: "/testimonials/chinedu.webp" },
  { id: "aisha-bello", src: "/testimonials/aisha.webp" },
  { id: "daniel-eze", src: "/testimonials/daniel.webp" },
  { id: "blessing-johnson", src: "/testimonials/blessing.webp" },
  { id: "ibrahim-musa", src: "/testimonials/ibrahim.webp" },
  { id: "esther-adeyemi", src: "/testimonials/esther.webp" },
  { id: "samuel-nwankwo", src: "/testimonials/samuel.webp" },
];

function portraitFor(story: SuccessStory) {
  const knownPortrait = portraits.find(({ id }) => id === story.id);
  if (knownPortrait) return knownPortrait.src;

  // API stories can be added independently; keep portrait assignment stable by id.
  const hash = Array.from(story.id).reduce(
    (value, character) => (value * 31 + character.charCodeAt(0)) >>> 0,
    0,
  );
  return portraits[hash % portraits.length].src;
}

export default function SuccessStoryCarousel({
  fallbackStories = [],
}: SuccessStoryCarouselProps) {
  const [stories, setStories] = useState<SuccessStory[]>(fallbackStories);

  useEffect(() => {
    const controller = new AbortController();

    const loadStories = async () => {
      try {
        const response = await fetch("/api/platform/success-stories?featured=true&limit=7", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;

        const result = (await response.json()) as SuccessStoriesResponse;
        if (result.ok && result.stories?.length) setStories(result.stories);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        // Keep the local fallback stories visible when the API is unavailable.
      }
    };

    void loadStories();
    return () => controller.abort();
  }, []);

  if (stories.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-muted px-6 py-10 text-center text-muted-foreground">
        Stories from our community are on the way.
      </div>
    );
  }

  return (
    <ScrollReelTestimonials
      testimonials={stories.map((story) => ({
        quote: story.story,
        author: story.location ? `${story.displayName} · ${story.location}` : story.displayName,
        image: portraitFor(story),
        alt: `AI-generated illustrative portrait for ${story.displayName}; not an actual photo`,
      }))}
    />
  );
}
