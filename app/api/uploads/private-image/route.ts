import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireAuthenticatedUser, tooManyRequestsResponse } from "@/lib/server/auth";
import { isRateLimited } from "@/lib/rate-limit";
import {
  maxPrivateImageSizeBytes,
  privateImageContentType,
  privateImageValidationError,
} from "@/lib/private-images";

type PrivateImageBucket = "receipts" | "kyc-documents";
const allowedBuckets = new Set<PrivateImageBucket>(["receipts", "kyc-documents"]);

function toSafeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-") || "upload";
}

function createFileId() {
  return (globalThis.crypto?.randomUUID?.() || randomUUID()) as string;
}

function isAllowedBucket(bucket: string): bucket is PrivateImageBucket {
  return allowedBuckets.has(bucket as PrivateImageBucket);
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    if (await isRateLimited(`private-upload:${auth.user.id}`, 30, 60 * 60_000)) {
      return tooManyRequestsResponse("Too many image uploads. Please try again later.");
    }

    // Reject oversized requests before parsing multipart data; allow room for its headers.
    const requestSize = Number(request.headers.get("content-length"));
    if (requestSize > maxPrivateImageSizeBytes + 64 * 1024) {
      return NextResponse.json({ error: "Image must be 5MB or smaller." }, { status: 413 });
    }
    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: "Send the image as a file upload." }, { status: 400 });
    }
    const bucket = String(formData.get("bucket") || "");
    const file = formData.get("file");

    if (!isAllowedBucket(bucket)) {
      return NextResponse.json({ error: "Unsupported upload bucket." }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Upload an image file." }, { status: 400 });
    }
    const validationError = privateImageValidationError(file);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const contentType = privateImageContentType(fileBuffer);
    if (!contentType || contentType !== file.type) {
      return NextResponse.json(
        { error: "Choose a valid JPG, PNG or WebP image." },
        { status: 400 },
      );
    }
    const fileId = createFileId();
    const safeName = toSafeFileName(file.name);

    await auth.db.query(
      `INSERT INTO private_files
         (id, user_id, bucket, file_name, content_type, size_bytes, data, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [fileId, auth.user.id, bucket, safeName, contentType, file.size, fileBuffer],
    );

    // Return a path in the same format the rest of the app expects:
    // "<userId>/<fileId>-<safeName>" — linkage routes also verify DB ownership.
    const path = `${auth.user.id}/${fileId}-${safeName}`;

    return NextResponse.json(
      { path },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Private image upload error:", error);
    return NextResponse.json(
      { error: "Image upload failed. Please try again." },
      { status: 500 },
    );
  }
}
