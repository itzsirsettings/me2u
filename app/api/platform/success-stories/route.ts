import { query } from "@/lib/railway/client";
import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { logApiError } from "@/lib/server/logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SuccessStory = {
  id: string;
  title: string;
  story: string;
  amount: number;
  category: string;
  displayName: string;
  createdAt: string;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const featured = searchParams.get("featured") === "true";
    const limit = Math.min(Number(searchParams.get("limit")) || 10, 50);

    let sql = `
      SELECT id, title, story, amount, category, display_name, created_at
      FROM success_stories
      WHERE is_public = true
    `;

    if (featured) {
      sql += ` AND is_featured = true ORDER BY featured_at DESC NULLS LAST`;
    } else {
      sql += ` ORDER BY created_at DESC`;
    }

    sql += ` LIMIT $1`;

    const { rows } = await query<{
      id: string;
      title: string;
      story: string;
      amount: string;
      category: string;
      display_name: string;
      created_at: string;
    }>(sql, [limit]);

    const stories: SuccessStory[] = rows.map((story) => ({
      id: story.id,
      title: story.title,
      story: story.story,
      amount: Number(story.amount),
      category: story.category,
      displayName: story.display_name,
      createdAt: story.created_at,
    }));

    return NextResponse.json(
      { ok: true, stories },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Pragma": "no-cache",
        },
      }
    );
  } catch (error) {
    logApiError("success-stories-get", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Create a success story (authenticated users only)
export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const body = await request.json();
    const { title, story, amount, category, displayName } = body;

    if (!title || !story || !amount || !category || !displayName) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { rows } = await query<{ id: string }>(
      `INSERT INTO success_stories 
        (user_id, title, story, amount, category, display_name, is_public, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, false, NOW())
       RETURNING id`,
      [auth.user.id, title, story, amount, category, displayName]
    );

    return NextResponse.json({ ok: true, storyId: rows[0]?.id });
  } catch (error) {
    logApiError("success-stories-post", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
