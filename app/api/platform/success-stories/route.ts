import { NextResponse } from "next/server";

import { query } from "@/lib/railway/client";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { logApiError } from "@/lib/server/logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const SUCCESS_STORY_CACHE_TTL_MS = 30_000;
const successStoryCache = new Map<string, { expiresAt: number; stories: SuccessStory[] }>();
const successStoryReads = new Map<string, Promise<SuccessStory[]>>();

type SuccessStory = {
  id: string;
  title: string;
  story: string;
  amount: number;
  category: string;
  displayName: string;
  createdAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function getPublicStories(featured: boolean, limit: number) {
  const cacheKey = `${featured ? "featured" : "recent"}:${limit}`;
  const cached = successStoryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.stories;

  const pending = successStoryReads.get(cacheKey);
  if (pending) return pending;

  const sql = featured
    ? `SELECT id, title, story, amount, category, display_name, created_at
       FROM success_stories
       WHERE is_public = true AND is_featured = true
       ORDER BY featured_at DESC NULLS LAST
       LIMIT $1`
    : `SELECT id, title, story, amount, category, display_name, created_at
       FROM success_stories
       WHERE is_public = true
       ORDER BY created_at DESC
       LIMIT $1`;

  const read = query<{
    id: string;
    title: string;
    story: string;
    amount: string;
    category: string;
    display_name: string;
    created_at: string;
  }>(sql, [limit]).then(({ rows }) => {
    const stories = rows.map((story) => ({
      id: story.id,
      title: story.title,
      story: story.story,
      amount: Number(story.amount),
      category: story.category,
      displayName: story.display_name,
      createdAt: story.created_at,
    }));
    successStoryCache.set(cacheKey, {
      expiresAt: Date.now() + SUCCESS_STORY_CACHE_TTL_MS,
      stories,
    });
    return stories;
  });

  successStoryReads.set(cacheKey, read);
  try {
    return await read;
  } finally {
    successStoryReads.delete(cacheKey);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const featured = searchParams.get("featured") === "true";
    const limit = Math.min(Number(searchParams.get("limit")) || 10, 50);

    const stories = await getPublicStories(featured, limit);

    return NextResponse.json(
      { ok: true, stories },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    logApiError("success-stories-get", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

// Create a success story (authenticated users only)
export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const body: unknown = await request.json();
    if (!isRecord(body)) {
      return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
    }
    const { title, story, amount, category, displayName } = body;

    if (
      typeof title !== "string" ||
      typeof story !== "string" ||
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      typeof category !== "string" ||
      typeof displayName !== "string"
    ) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const { rows } = await query<{ id: string }>(
      `INSERT INTO success_stories 
        (user_id, title, story, amount, category, display_name, is_public, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, false, NOW())
       RETURNING id`,
      [auth.user.id, title, story, amount, category, displayName],
    );

    return NextResponse.json({ ok: true, storyId: rows[0]?.id });
  } catch (error) {
    logApiError("success-stories-post", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
