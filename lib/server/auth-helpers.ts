import { createHmac } from "crypto";

export function getGoogleUserPassword(email: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || "fallback_secret_for_dev_only";
  return createHmac("sha256", secret)
    .update(`google-auth:${email.toLowerCase().trim()}`)
    .digest("hex")
    .slice(0, 32);
}
