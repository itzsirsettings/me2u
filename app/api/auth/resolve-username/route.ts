import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(`login-username-ip:${clientIp}`, 20, 10 * 60_000)) {
      return NextResponse.json(
        { error: "Too many login attempts. Please wait and try again." },
        { status: 429 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const username = String(body.username || "").trim().toLowerCase();

    if (!/^[a-z0-9]{3,30}$/.test(username)) {
      return NextResponse.json({ error: "Enter a valid username." }, { status: 400 });
    }

    if (isRateLimited(`login-username:${username}`, 10, 10 * 60_000)) {
      return NextResponse.json(
        { error: "Too many login attempts. Please wait and try again." },
        { status: 429 },
      );
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("email")
      .ilike("username", username)
      .maybeSingle();

    if (error) throw error;
    if (!data?.email) {
      return NextResponse.json({ error: "Username was not found." }, { status: 404 });
    }

    return NextResponse.json({ email: data.email });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to resolve username.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
