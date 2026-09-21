/** Shared by browser previews and server routes; contains no authentication or storage code. */
export const maxPrivateImageSizeBytes = 5 * 1024 * 1024;
export const privateImageAccept = "image/jpeg,image/png,image/webp";

export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function privateImageFileId(path: string | null | undefined): string | null {
  if (!path) return null;
  const segments = path.split("/");
  if (segments.length !== 2 || !uuidPattern.test(segments[0])) return null;
  const fileSegment = segments[1];
  const fileId = fileSegment.slice(0, 36);
  if (!uuidPattern.test(fileId)) return null;
  if (fileSegment.length > 36 && (fileSegment[36] !== "-" || fileSegment.length === 37)) {
    return null;
  }
  return fileId;
}

export function privateImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  // Existing records may refer to the legacy storage service.
  if (/^https?:\/\//i.test(path)) return path;
  const fileId = privateImageFileId(path);
  return fileId ? `/api/uploads/file/${fileId}` : null;
}

export function privateImageValidationError(file: {
  type: string;
  size: number;
}): string | null {
  if (!privateImageAccept.split(",").includes(file.type)) {
    return "Upload a JPG, PNG or WebP image.";
  }
  if (file.size === 0) return "The image is empty. Choose another file.";
  if (file.size > maxPrivateImageSizeBytes) return "Image must be 5MB or smaller.";
  return null;
}

/** Do not trust a browser-supplied MIME type for files served from our origin. */
export function privateImageContentType(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 8 && pngSignature.every((value, index) => bytes[index] === value)) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}
