import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";

type SignedUrlBucket = "receipts" | "kyc-documents";

const allowedBuckets = new Set<SignedUrlBucket>(["receipts", "kyc-documents"]);
const maxSignedUrlTtlSeconds = 10 * 60;

function isAllowedBucket(bucket: string): bucket is SignedUrlBucket {
  return allowedBuckets.has(bucket as SignedUrlBucket);
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const body = await request.json();
    const bucket = String(body.bucket || "");
    const path = String(body.path || "").trim();
    const requestedExpiresIn = Number(body.expiresIn);
    const expiresIn =
      Number.isFinite(requestedExpiresIn) && requestedExpiresIn > 0
        ? Math.min(requestedExpiresIn, maxSignedUrlTtlSeconds)
        : maxSignedUrlTtlSeconds;

    if (!isAllowedBucket(bucket)) {
      return NextResponse.json({ error: "Unsupported storage bucket." }, { status: 400 });
    }

    if (!path || isHttpUrl(path)) {
      return NextResponse.json({ error: "A private storage path is required." }, { status: 400 });
    }

    const { data: profile, error: profileError } = await auth.supabase
      .from("profiles")
      .select("role")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Only admins can view this file." }, { status: 403 });
    }

    const { data, error } = await auth.supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error("Signed URL error:", error);
      return NextResponse.json({ error: "Unable to create signed URL." }, { status: 500 });
    }

    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch (error) {
    console.error("Signed URL error:", error);
    return NextResponse.json({ error: "Unable to create signed URL." }, { status: 500 });
  }
}
