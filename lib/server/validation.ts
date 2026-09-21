/**
 * Shared request validation helpers.
 * Single source of truth for email / amount / phone / bank-field parsing
 * used by all Next.js API routes.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MONEY_AMOUNT = 10_000_000;

export function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && EMAIL_RE.test(value.trim());
}

export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function assertValidEmail(value: unknown, label = "Email"): string {
  const email = normalizeEmail(value);
  if (!email) throw new Error(`${label} is required.`);
  if (!isValidEmail(email)) throw new Error("Enter a valid email address.");
  return email;
}

export function readPositiveAmount(
  value: unknown,
  label = "Amount",
  max = MAX_MONEY_AMOUNT,
): number {
  if (typeof value !== "number" && typeof value !== "string") {
    throw new Error(`${label} must be a valid amount.`);
  }
  if (typeof value === "string" && !/^\d+(?:\.\d{1,2})?$/.test(value.trim())) {
    throw new Error(`${label} must have at most two decimal places.`);
  }
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }
  if (amount > max) {
    throw new Error(`${label} must not exceed ₦${max.toLocaleString()}.`);
  }
  const cents = Math.round(amount * 100);
  if (cents < 1 || Math.abs(amount * 100 - cents) > 0.000001) {
    throw new Error(`${label} must have at most two decimal places.`);
  }
  return cents / 100;
}

export function readOptionalPositiveAmount(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  return readPositiveAmount(value);
}

export function readTrimmedString(value: unknown, maxLength = 500): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export function readRequiredString(value: unknown, label: string, maxLength = 500): string {
  const text = readTrimmedString(value, maxLength);
  if (!text) throw new Error(`${label} is required.`);
  return text;
}

export function isValidNigerianPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export function assertValidPhone(value: unknown, label = "Phone number"): string {
  const phone = typeof value === "string" ? value.trim() : "";
  if (!phone) throw new Error(`${label} is required.`);
  if (!isValidNigerianPhone(phone)) throw new Error("Enter a valid phone number.");
  return phone;
}

export function readAccountNumber(value: unknown): string {
  const digits = typeof value === "string" ? value.replace(/\D/g, "") : "";
  if (digits.length !== 10) throw new Error("Account number must be 10 digits.");
  return digits;
}

export function readBankCode(value: unknown): string {
  const code = readTrimmedString(value, 20);
  if (!code) throw new Error("Bank is required.");
  return code;
}

export function readPin(value: unknown, label = "PIN"): string {
  const pin = typeof value === "string" ? value.trim() : "";
  if (!/^\d{4}$/.test(pin)) throw new Error(`${label} must be 4 digits.`);
  return pin;
}
