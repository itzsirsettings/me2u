import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { privateImageFileId } from "@/lib/private-images";

/**
 * POST /api/uploads/signed-url
 *
 * Previously generated an S3 presigned URL. Now that files live in
 * PostgreSQL on Railway, we simply return a first-party URL pointing
 * to the /api/uploads/file/:id endpoint which streams the bytes out
 * with the caller's auth token.  The "path" stored on payment_proofs
 * and profiles is "<userId>/<fileId>-<safeName>" — we extract the
 * UUID from it and build the API URL.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    // Only admins use this endpoint (admin overview panel).
    if (auth.user.role !== "admin") {
      return NextResponse.json({ error: "Only admins can view this file." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const path = String(body.path || "").trim();

    if (!path) {
      return NextResponse.json({ error: "A storage path is required." }, { status: 400 });
    }

    const fileId = privateImageFileId(path);
    if (!fileId) {
      return NextResponse.json({ error: "Invalid storage path." }, { status: 400 });
    }

    // Return a first-party URL — the admin page fetches this with
    // the Railway JWT attached, same as any other API call.
    const fileUrl = `/api/uploads/file/${fileId}`;

    return NextResponse.json(
      { signedUrl: fileUrl },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("File URL error:", error);
    return NextResponse.json({ error: "Unable to generate file URL." }, { status: 500 });
  }
}
