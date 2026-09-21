import { requireAuthenticatedUser } from "@/lib/server/auth";
import { privateImageContentType, uuidPattern } from "@/lib/private-images";

/**
 * GET /api/uploads/file/:id
 *
 * Streams a private file stored in PostgreSQL back to the caller.
 * - Admin users can fetch any file (admin overview panel).
 * - Regular users can only fetch their own files.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const { id: fileId } = await params;

    if (!uuidPattern.test(fileId)) {
      return new Response(JSON.stringify({ error: "A valid file ID is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { rows } = await auth.db.query<{
      user_id: string;
      content_type: string;
      file_name: string;
      size_bytes: number;
      data: Buffer;
    }>(
      `SELECT user_id, content_type, file_name, size_bytes, data
       FROM private_files
       WHERE id = $1 AND (user_id = $2 OR $3 = true)`,
      [fileId, auth.user.id, auth.user.role === "admin"],
    );

    const file = rows[0];
    if (!file) {
      return new Response(JSON.stringify({ error: "File not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const contentType = privateImageContentType(file.data);
    if (!contentType) {
      return new Response(JSON.stringify({ error: "This file is not a supported image." }), {
        status: 415,
        headers: { "Content-Type": "application/json" },
      });
    }

    // pg returns bytea as a Buffer; convert to Uint8Array for the Web Response API.
    const body = new Uint8Array(file.data);

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(body.byteLength),
        "Content-Disposition": `inline; filename="${file.file_name.replace(/[^a-zA-Z0-9._-]/g, "-")}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    console.error("File serve error:", error);
    return new Response(JSON.stringify({ error: "Unable to retrieve file." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
