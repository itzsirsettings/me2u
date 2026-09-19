import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import {
  errorResponse,
  requireAuthenticatedUser,
  tooManyRequestsResponse,
} from "@/lib/server/auth";

export async function GET(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (await isRateLimited(`learn-progress-get-ip:${clientIp}`, 300, 15 * 60_000)) return tooManyRequestsResponse();

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const { rows } = await auth.db.query(
      `SELECT user_id, lesson_key, completed_at
       FROM learning_progress
       WHERE user_id = $1
       ORDER BY completed_at DESC`,
      [auth.user.id],
    );

    return NextResponse.json({ ok: true, progress: rows });
  } catch (error) {
    return errorResponse(error, "Unable to load learning progress.");
  }
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (await isRateLimited(`learn-progress-post-ip:${clientIp}`, 300, 15 * 60_000)) return tooManyRequestsResponse();

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const body = await request.json().catch(() => ({}));
    const lessonKey = String(body.lessonKey || "").trim();
    const completed = body.completed !== false;

    if (!lessonKey || lessonKey.length > 140) throw new Error("Lesson key is required.");

    if (completed) {
      await auth.db.query(
        `INSERT INTO learning_progress (user_id, lesson_key, completed_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id, lesson_key) DO UPDATE SET completed_at = NOW()`,
        [auth.user.id, lessonKey],
      );
    } else {
      await auth.db.query(
        `DELETE FROM learning_progress WHERE user_id = $1 AND lesson_key = $2`,
        [auth.user.id, lessonKey],
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to save learning progress.");
  }
}
