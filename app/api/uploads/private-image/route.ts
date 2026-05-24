import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireAuthenticatedUser } from "@/lib/server/auth";

type PrivateImageBucket = "receipts" | "kyc-documents";

const allowedBuckets = new Set<PrivateImageBucket>(["receipts", "kyc-documents"]);
const maxImageSizeBytes = 5 * 1024 * 1024;

function toSafeStorageFileName(fileName: string) {
  const cleaned = fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
  return cleaned || "upload";
}

function createStorageId() {
  return globalThis.crypto?.randomUUID?.() || randomUUID();
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
      return NextResponse.json({ error: "Image must be 5MB or smaller." }, { status: 400 });
    }

    const filePath = `${auth.user.id}/${createStorageId()}-${toSafeStorageFileName(file.name)}`;
    const { error } = await auth.supabase.storage.from(bucket).upload(filePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      console.error("Private image upload error:", error);
      return NextResponse.json({ error: "Image upload failed. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ path: filePath });
  } catch (error) {
    console.error("Private image upload error:", error);
    return NextResponse.json({ error: "Image upload failed. Please try again." }, { status: 500 });
  }
}
