import { authorizedFetch } from "@/lib/fetch";
import { privateImageValidationError } from "@/lib/private-images";

export { privateImageUrl } from "@/lib/private-images";

export type PrivateImageBucket = "receipts" | "kyc-documents";

export async function uploadPrivateImage(
  bucket: PrivateImageBucket,
  userId: string,
  file: File,
): Promise<string> {
  const validationError = privateImageValidationError(file);
  if (validationError) throw new Error(validationError);

  const formData = new FormData();
  formData.append("bucket", bucket);
  formData.append("file", file);

  // The HTTP-only session cookie is the primary authentication mechanism.
  // `authorizedFetch` includes credentials and the CSRF header required for
  // this state-changing, cookie-authenticated request.
  const response = await authorizedFetch("/api/uploads/private-image", {
    method: "POST",
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
