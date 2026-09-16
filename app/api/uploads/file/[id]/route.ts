import { requireAuthenticatedUser } from "@/lib/server/auth";

/**
 * GET /api/uploads/file/:id
 *
 * Streams a private file stored in PostgreSQL back to the caller.
 * - Admin users can fetch any file (admin overview panel).
 * - Regular users can only fetch their own files.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const { id: fileId } = await params;

    if (!fileId) {
      return new Response(JSON.stringify({ error: "File ID is required." }), {
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
       WHERE id = $1`,
      [fileId],
    );

    const file = rows[0];
    if (!file) {
      return new Response(JSON.stringify({ error: "File not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Admins can view any file; regular users only their own.
    const isAdmin = auth.user.role === "admin";
    if (!isAdmin && file.user_id !== auth.user.id) {
      return new Response(JSON.stringify({ error: "Not authorised." }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // pg returns bytea as a Buffer; convert to Uint8Array for the Web Response API.
    const body = new Uint8Array(file.data);

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": file.content_type,
        "Content-Length": String(file.size_bytes),
        "Content-Disposition": `inline; filename="${file.file_name}"`,
        "Cache-Control": "private, no-store",
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
