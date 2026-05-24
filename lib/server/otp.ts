import { createHmac, randomBytes, randomInt, timingSafeEqual } from "crypto";

export type OtpPurpose = "login" | "register" | "password_reset";
export type FlowTokenPurpose = "register_complete" | "password_reset_complete";

const tokenVersion = "v1";
const defaultOtpTtlMs = 10 * 60_000;
const defaultFlowTtlMs = 15 * 60_000;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getAuthTokenSecret() {
  const secret = process.env.AUTH_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error("Missing AUTH_TOKEN_SECRET or SUPABASE_SERVICE_ROLE_KEY.");
  }

  if (process.env.NODE_ENV === "production" && secret.length < 32) {
    throw new Error("AUTH_TOKEN_SECRET must be at least 32 characters in production.");
  }

  return secret;
}

function sign(value: string) {
  return createHmac("sha256", getAuthTokenSecret()).update(value).digest("hex");
}

function constantTimeHexEqual(left: string, right: string) {
  if (!/^[a-f0-9]+$/i.test(left) || !/^[a-f0-9]+$/i.test(right)) return false;

  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function generateOtpCode() {
  return randomInt(100000, 1000000).toString();
}

export function createSignedOtpToken({
  email,
  code,
  purpose,
  ttlMs = defaultOtpTtlMs,
}: {
  email: string;
  code: string;
  purpose: OtpPurpose;
  ttlMs?: number;
}) {
  const normalizedEmail = normalizeEmail(email);
  const expiresAt = Date.now() + ttlMs;
  const nonce = randomBytes(16).toString("hex");
  const payload = [tokenVersion, "otp", purpose, normalizedEmail, code, expiresAt, nonce].join(":");
  const signature = sign(payload);

  return `${tokenVersion}.otp.${purpose}.${expiresAt}.${nonce}.${signature}`;
}

export function verifySignedOtpToken({
  email,
  code,
  token,
  purpose,
}: {
  email: string;
  code: string;
  token: string;
  purpose: OtpPurpose;
}) {
  if (!/^\d{6}$/.test(code)) return false;

  const [version, tokenKind, tokenPurpose, expiresAtRaw, nonce, signature] = token.split(".");
  const expiresAt = Number(expiresAtRaw);

  if (
    version !== tokenVersion ||
    tokenKind !== "otp" ||
    tokenPurpose !== purpose ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= Date.now() ||
    !/^[a-f0-9]{32}$/i.test(nonce || "")
  ) {
    return false;
  }

  const normalizedEmail = normalizeEmail(email);
  const payload = [tokenVersion, "otp", purpose, normalizedEmail, code, expiresAt, nonce].join(":");

  return constantTimeHexEqual(signature || "", sign(payload));
}

export function createSignedFlowToken({
  email,
  purpose,
  ttlMs = defaultFlowTtlMs,
}: {
  email: string;
  purpose: FlowTokenPurpose;
  ttlMs?: number;
}) {
  const normalizedEmail = normalizeEmail(email);
  const expiresAt = Date.now() + ttlMs;
  const nonce = randomBytes(16).toString("hex");
  const payload = [tokenVersion, "flow", purpose, normalizedEmail, expiresAt, nonce].join(":");
  const signature = sign(payload);

  return `${tokenVersion}.flow.${purpose}.${expiresAt}.${nonce}.${signature}`;
}

export function verifySignedFlowToken({
  email,
  token,
  purpose,
}: {
  email: string;
  token: string;
  purpose: FlowTokenPurpose;
}) {
  const [version, tokenKind, tokenPurpose, expiresAtRaw, nonce, signature] = token.split(".");
  const expiresAt = Number(expiresAtRaw);

  if (
    version !== tokenVersion ||
    tokenKind !== "flow" ||
    tokenPurpose !== purpose ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= Date.now() ||
    !/^[a-f0-9]{32}$/i.test(nonce || "")
  ) {
    return false;
  }

  const normalizedEmail = normalizeEmail(email);
  const payload = [tokenVersion, "flow", purpose, normalizedEmail, expiresAt, nonce].join(":");

  return constantTimeHexEqual(signature || "", sign(payload));
}
