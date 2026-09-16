import { query, queryAsUser } from "@/lib/railway/client";
import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { logApiError } from "@/lib/server/logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type EducationContent = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  difficulty: string;
  estimatedMinutes: number;
  isFeatured: boolean;
  completed?: boolean;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const featured = searchParams.get("featured") === "true";
    const slug = searchParams.get("slug");

    // Try to get authenticated user (optional for public content)
    let userId: string | null = null;
    try {
      const auth = await requireAuthenticatedUser(request);
      if ("user" in auth) {
        userId = auth.user.id;
      }
    } catch {
      // Not authenticated - that's okay for public content
    }

    // Build query
    let sql = `SELECT * FROM education_content WHERE 1=1`;
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (slug) {
      sql += ` AND slug = $${paramIndex++}`;
      params.push(slug);
    } else {
      if (category) {
        sql += ` AND category = $${paramIndex++}`;
        params.push(category);
      }
      if (featured) {
        sql += ` AND is_featured = true`;
      }
      sql += ` ORDER BY order_index, created_at`;
    }

    const { rows: content } = await query<{
      id: string;
      slug: string;
      title: string;
      summary: string;
      content: string;
      category: string;
      difficulty: string;
      estimated_minutes: number;
      is_featured: boolean;
    }>(sql, params);

    // If user is authenticated, check completion status
    let completedLessons = new Set<string>();
    if (userId) {
      const { rows: progress } = await queryAsUser<{ lesson_key: string }>(
        userId,
        `SELECT lesson_key FROM learning_progress WHERE user_id = $1`,
        [userId]
      );
      completedLessons = new Set(progress.map((p) => p.lesson_key));
    }

    // Format response
    if (slug) {
      // Single article
      if (content.length === 0) {
        return NextResponse.json(
          { ok: false, error: "Article not found" },
          { status: 404 }
        );
      }

      const item = content[0];
      const article: EducationContent = {
        id: item.id,
        slug: item.slug,
        title: item.title,
        summary: item.summary,
        content: item.content,
        category: item.category,
        difficulty: item.difficulty,
        estimatedMinutes: item.estimated_minutes,
        isFeatured: item.is_featured,
        completed: userId ? completedLessons.has(item.slug) : undefined,
      };

      return NextResponse.json({ ok: true, article });
    } else {
      // List of articles
      const articles: EducationContent[] = content.map((item) => ({
        id: item.id,
        slug: item.slug,
        title: item.title,
        summary: item.summary,
        content: item.content,
        category: item.category,
        difficulty: item.difficulty,
        estimatedMinutes: item.estimated_minutes,
        isFeatured: item.is_featured,
        completed: userId ? completedLessons.has(item.slug) : undefined,
      }));

      const categories = [
        "borrowing",
        "saving",
        "trust_score",
        "security",
        "circles",
        "general",
      ];

      return NextResponse.json({
        ok: true,
        articles,
        categories,
        totalCompleted: userId ? completedLessons.size : 0,
      });
    }
  } catch (error) {
    logApiError("education-content-get", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Mark lesson as completed
export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const body = await request.json();
    const { lessonKey } = body;

    if (!lessonKey) {
      return NextResponse.json(
        { ok: false, error: "Missing lesson key" },
        { status: 400 }
      );
    }

    // Mark as completed (ignore duplicates)
    await queryAsUser(
      auth.user.id,
      `INSERT INTO learning_progress (user_id, lesson_key, completed_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id, lesson_key) DO NOTHING`,
      [auth.user.id, lessonKey]
    );

    return NextResponse.json({ ok: true, completed: true });
  } catch (error) {
    logApiError("education-content-post", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
