import { getToken } from "@/lib/railway/token";

export type PrivateImageBucket = "receipts" | "kyc-documents";

const maxImageSizeBytes = 5 * 1024 * 1024;

export async function uploadPrivateImage(bucket: PrivateImageBucket, userId: string, file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Upload an image file.");
  }

  if (file.size > maxImageSizeBytes) {
    throw new Error("Image must be 5MB or smaller.");
  }

  const token = getToken();
  if (!token) throw new Error("Please log in first.");

  const formData = new FormData();
  formData.append("bucket", bucket);
  formData.append("file", file);

  const response = await fetch("/api/uploads/private-image", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Image upload failed.");
  }

  if (typeof data.path !== "string" || !data.path.startsWith(`${userId}/`)) {
    throw new Error("Image upload failed.");
  }

  return data.path;
}
