"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Clock,
  CheckCircle,
  TrendingUp,
  Shield,
  Users,
  Wallet,
  Award,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { makeEffectController, isAbortError } from "@/lib/fetch";

type EducationArticle = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  difficulty: string;
  estimatedMinutes: number;
  isFeatured: boolean;
  completed?: boolean;
};

type EducationData = {
  articles: EducationArticle[];
  categories: string[];
  totalCompleted: number;
};

const categoryIcons: Record<string, any> = {
  borrowing: Wallet,
  saving: TrendingUp,
  trust_score: Award,
  security: Shield,
  circles: Users,
  general: BookOpen,
};

const categoryLabels: Record<string, string> = {
  borrowing: "Borrowing",
  saving: "Saving",
  trust_score: "Trust Score",
  security: "Security",
  circles: "Circles",
  general: "General",
};

const difficultyColors: Record<string, string> = {
  beginner: "bg-green/20 text-green",
  intermediate: "bg-blue-500/20 text-blue-500",
  advanced: "bg-purple-500/20 text-purple-500",
};

export default function EducationHub() {
  const [data, setData] = useState<EducationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { signal, cancel } = makeEffectController();
    let settled = false;

    const loadContent = async () => {
      try {
        const response = await fetch("/api/education/content", {
          cache: "no-store",
          signal,
        });
        const result = await response.json().catch(() => ({}));

        if (result.ok) {
          setData(result);
          setError(null);
        } else if (typeof result.error === "string") {
          setError(result.error);
        }
      } catch (err) {
        if (isAbortError(err)) return;
        const msg = err instanceof Error ? err.message : "Failed to load";
        setError(msg);
        console.error("Failed to load education content:", err);
      } finally {
        if (!settled) setLoading(false);
      }
    };

    loadContent();
    return () => {
      settled = true;
      cancel();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="text-center py-12 px-6 rounded-2xl border border-amber-500/30 bg-amber-500/5">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <p className="font-bold text-card-foreground">Couldn&apos;t load education content</p>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load education content
      </div>
    );
  }

  const filteredArticles =
    selectedCategory === "all"
      ? data.articles
      : data.articles.filter((a) => a.category === selectedCategory);

  const featuredArticles = data.articles.filter((a) => a.isFeatured);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-black text-card-foreground mb-2">
          Financial Education
        </h1>
        <p className="text-muted-foreground">
          Learn how to make the most of Me2U and build your financial knowledge
        </p>
        {data.totalCompleted > 0 && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green/10 border border-green/30">
            <CheckCircle className="w-4 h-4 text-green" />
            <span className="text-sm font-bold text-green">
              {data.totalCompleted} lessons completed
            </span>
          </div>
        )}
      </div>

      {/* Featured Articles */}
      {featuredArticles.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-black text-card-foreground">
            Featured Guides
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featuredArticles.map((article, index) => {
              const CategoryIcon =
                categoryIcons[article.category] || BookOpen;

              return (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={`/education/${article.slug}`}
                    className="block group"
                  >
                    <div className="relative overflow-hidden rounded-2xl border-2 border-green/30 bg-gradient-to-br from-green/10 to-card p-6 hover:shadow-lg transition-all">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-green/20">
                          <CategoryIcon className="w-6 h-6 text-green" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {article.completed && (
                              <CheckCircle className="w-4 h-4 text-green flex-shrink-0" />
                            )}
                            <h3 className="font-bold text-card-foreground group-hover:text-green transition-colors">
                              {article.title}
                            </h3>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {article.summary}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {article.estimatedMinutes} min
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold capitalize ${
                                difficultyColors[article.difficulty] ||
                                difficultyColors.beginner
                              }`}
                            >
                              {article.difficulty}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
            selectedCategory === "all"
              ? "bg-green text-white"
              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
          }`}
        >
          All Topics
        </button>
        {data.categories.map((cat) => {
          const Icon = categoryIcons[cat] || BookOpen;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                selectedCategory === cat
                  ? "bg-green text-white"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              <Icon className="w-4 h-4" />
              {categoryLabels[cat] || cat}
            </button>
          );
        })}
      </div>

      {/* All Articles */}
      <div className="space-y-3">
        {filteredArticles.length > 0 ? (
          filteredArticles.map((article, index) => {
            const CategoryIcon = categoryIcons[article.category] || BookOpen;

            return (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Link href={`/education/${article.slug}`} className="block group">
                  <div
                    className={`rounded-2xl border p-4 transition-all ${
                      article.completed
                        ? "border-green/30 bg-green/5"
                        : "border-border bg-card hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-3 rounded-xl ${
                          article.completed
                            ? "bg-green/20"
                            : "bg-secondary"
                        }`}
                      >
                        <CategoryIcon
                          className={`w-5 h-5 ${
                            article.completed
                              ? "text-green"
                              : "text-muted-foreground"
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {article.completed && (
                            <CheckCircle className="w-4 h-4 text-green flex-shrink-0" />
                          )}
                          <h3 className="font-bold text-card-foreground group-hover:text-green transition-colors">
                            {article.title}
                          </h3>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                          {article.summary}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {article.estimatedMinutes} min read
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold capitalize ${
                              difficultyColors[article.difficulty] ||
                              difficultyColors.beginner
                            }`}
                          >
                            {article.difficulty}
                          </span>
                          <span className="capitalize">
                            {categoryLabels[article.category]}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No articles found in this category
          </div>
        )}
      </div>
    </div>
  );
}
