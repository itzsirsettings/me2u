import { createHmac, timingSafeEqual } from "node:crypto";

const pinVerifierPrefix = "v1:";

function getPinSecret() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NIN_HASH_SECRET;
  if (!secret) throw new Error("Missing server PIN verifier secret.");
  return secret;
}

function createTransactionPinVerifier(userId: string, pin: string) {
  const digest = createHmac("sha256", getPinSecret()).update(`${userId}:${pin}`).digest("hex");
  return `${pinVerifierPrefix}${digest}`;
}

export function verifyTransactionPin(storedVerifier: string | null | undefined, userId: string, pin: string) {
  if (!storedVerifier || !/^\d{4}$/.test(pin)) return false;
  if (/^\d{4}$/.test(storedVerifier)) return storedVerifier === pin;
  if (!storedVerifier.startsWith(pinVerifierPrefix)) return false;

  const expected = createTransactionPinVerifier(userId, pin);
  const storedBuffer = Buffer.from(storedVerifier);
  const expectedBuffer = Buffer.from(expected);

  return storedBuffer.length === expectedBuffer.length && timingSafeEqual(storedBuffer, expectedBuffer);
}
