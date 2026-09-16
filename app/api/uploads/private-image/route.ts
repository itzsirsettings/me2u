import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireAuthenticatedUser } from "@/lib/server/auth";

type PrivateImageBucket = "receipts" | "kyc-documents";
const allowedBuckets = new Set<PrivateImageBucket>(["receipts", "kyc-documents"]);
const maxImageSizeBytes = 5 * 1024 * 1024; // 5 MB

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

    const formData = await request.formData();
    const bucket = String(formData.get("bucket") || "");
    const file = formData.get("file");

    if (!isAllowedBucket(bucket)) {
      return NextResponse.json({ error: "Unsupported upload bucket." }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Upload an image file." }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Upload an image file." }, { status: 400 });
    }
    if (file.size > maxImageSizeBytes) {
      return NextResponse.json({ error: "Image must be 5 MB or smaller." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const fileId = createFileId();
    const safeName = toSafeFileName(file.name);

    await auth.db.query(
      `INSERT INTO private_files
         (id, user_id, bucket, file_name, content_type, size_bytes, data, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [fileId, auth.user.id, bucket, safeName, file.type, file.size, fileBuffer],
    );

    // Return a path in the same format the rest of the app expects:
    // "<userId>/<fileId>-<safeName>"  — userId prefix lets the KYC route
    // verify ownership with a simple startsWith check.
    const path = `${auth.user.id}/${fileId}-${safeName}`;

    return NextResponse.json({ path });
  } catch (error) {
    console.error("Private image upload error:", error);
    return NextResponse.json(
      { error: "Image upload failed. Please try again." },
      { status: 500 },
    );
  }
}
