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
    if (isRateLimited(`learn-progress-get-ip:${clientIp}`, 60, 60_000)) return tooManyRequestsResponse();

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const { data, error } = await auth.supabase
      .from("learning_progress")
      .select("*")
      .eq("user_id", auth.user.id)
      .order("completed_at", { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, progress: data || [] });
  } catch (error) {
    return errorResponse(error, "Unable to load learning progress.");
  }
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(`learn-progress-post-ip:${clientIp}`, 60, 60_000)) return tooManyRequestsResponse();

    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const body = await request.json().catch(() => ({}));
    const lessonKey = String(body.lessonKey || "").trim();
    const completed = body.completed !== false;

    if (!lessonKey || lessonKey.length > 140) throw new Error("Lesson key is required.");

    if (completed) {
      const { error } = await auth.supabase
        .from("learning_progress")
        .upsert(
          { user_id: auth.user.id, lesson_key: lessonKey, completed_at: new Date().toISOString() },
          { onConflict: "user_id,lesson_key" },
        );
      if (error) throw new Error(error.message);
    } else {
      const { error } = await auth.supabase
        .from("learning_progress")
        .delete()
        .eq("user_id", auth.user.id)
        .eq("lesson_key", lessonKey);
      if (error) throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to save learning progress.");
  }
}
