/**
 * Safe JSON body parsing for API routes.
 * Never throws on malformed JSON — returns a fallback object instead.
 */

export type JsonBody = Record<string, unknown>;

export async function safeParseBody<T extends JsonBody = JsonBody>(request: Request): Promise<T> {
  try {
    const data = await request.json();
    if (data && typeof data === "object" && !Array.isArray(data)) return data as T;
    return {} as T;
  } catch {
    return {} as T;
  }
}
