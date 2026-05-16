import { createHmac } from "crypto";

export type VerifiedNinProfile = {
  firstName: string;
  lastName: string;
  otherNames?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  ninHash: string;
  ninLast4: string;
};

function normalizeName(value: unknown) {
  if (typeof value !== "string") return "";

  const cleaned = value.trim().replace(/\s+/g, " ");
  if (!cleaned) return "";

  const lettersOnly = cleaned.replace(/[^a-z]/gi, "");
  const shouldTitleCase =
    lettersOnly.length > 0 && (cleaned === cleaned.toUpperCase() || cleaned === cleaned.toLowerCase());

  if (!shouldTitleCase) return cleaned;

  return cleaned
    .split(" ")
    .map((word) =>
      word
        .split("-")
        .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}` : part))
        .join("-"),
    )
    .join(" ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = normalizeName(source[key]);
    if (value) return value;
  }

  return "";
}

function readProfileFromRecord(source: Record<string, unknown>) {
  const firstName = readString(source, [
    "firstName",
    "first_name",
    "firstname",
    "first_name_on_nin",
    "givenName",
    "given_name",
    "fname",
  ]);

  const lastName = readString(source, [
    "lastName",
    "last_name",
    "surname",
    "lastname",
    "familyName",
    "family_name",
    "lname",
  ]);

  const otherNames = readString(source, [
    "middleName",
    "middle_name",
    "middlename",
    "otherName",
    "other_name",
    "otherNames",
    "other_names",
  ]);

  const phone = readString(source, [
    "phone",
    "phoneNumber",
    "phone_number",
    "telephoneno",
    "telephoneNo",
    "mobile",
    "mobileNumber",
    "msisdn",
  ]);

  return {
    firstName,
    lastName,
    otherNames: otherNames || undefined,
    phone: phone || undefined,
    dateOfBirth:
      readString(source, ["dateOfBirth", "date_of_birth", "birthdate", "dob"]) || undefined,
    gender: readString(source, ["gender", "sex"]) || undefined,
  };
}

function collectProviderRecords(payload: unknown) {
  const records: Record<string, unknown>[] = [];
  const seen = new Set<unknown>();

  const visit = (value: unknown, depth: number) => {
    if (depth > 4 || seen.has(value)) return;
    seen.add(value);

    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, depth + 1));
      return;
    }

    if (!isRecord(value)) return;

    records.push(value);
    Object.values(value).forEach((child) => visit(child, depth + 1));
  };

  visit(payload, 0);
  return records;
}

function readProviderProfile(payload: unknown) {
  const candidates = collectProviderRecords(payload);

  for (const source of candidates) {
    const profile = readProfileFromRecord(source);
    if (profile.firstName && profile.lastName) return profile;
  }

  return {
    firstName: "",
    lastName: "",
    otherNames: undefined,
    phone: undefined,
    dateOfBirth: undefined,
    gender: undefined,
  };
}

function readDemoProfile(normalizedNin: string) {
  const demoNin = process.env.NIN_DEMO_NIN || process.env.NEXT_PUBLIC_NIN_DEMO_NIN || "00000000000";

  if (normalizedNin !== demoNin) return null;

  const firstName = normalizeName(process.env.NIN_DEMO_FIRST_NAME) || "Demo";
  const lastName = normalizeName(process.env.NIN_DEMO_LAST_NAME) || "User";
  const otherNames = normalizeName(process.env.NIN_DEMO_OTHER_NAMES);
  const phone = normalizeName(process.env.NIN_DEMO_PHONE) || "08000000000";

  return {
    firstName,
    lastName,
    otherNames: otherNames || undefined,
    phone: phone || undefined,
    dateOfBirth: undefined,
    gender: undefined,
    ninHash: hashNin(normalizedNin),
    ninLast4: normalizedNin.slice(-4),
  };
}

function getProviderHeaders(providerKey: string) {
  const authHeader = process.env.NIN_VERIFICATION_AUTH_HEADER || "Authorization";
  const authScheme = process.env.NIN_VERIFICATION_AUTH_SCHEME ?? "Bearer";
  const configuredHeaders = process.env.NIN_VERIFICATION_EXTRA_HEADERS;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  headers[authHeader] = authScheme ? `${authScheme} ${providerKey}` : providerKey;

  if (configuredHeaders) {
    try {
      const parsed = JSON.parse(configuredHeaders) as unknown;
      if (isRecord(parsed)) {
        for (const [key, value] of Object.entries(parsed)) {
          if (typeof value === "string" && key.toLowerCase() !== "content-length") {
            headers[key] = value;
          }
        }
      }
    } catch {
      throw new Error("NIN_VERIFICATION_EXTRA_HEADERS must be valid JSON.");
    }
  }

  return headers;
}

function getProviderBody(normalizedNin: string) {
  const requestField = process.env.NIN_VERIFICATION_REQUEST_FIELD || "nin";

  return {
    [requestField]: normalizedNin,
  };
}

export function validateNin(nin: string) {
  return /^\d{11}$/.test(nin.trim());
}

export function hashNin(nin: string) {
  const secret = process.env.NIN_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("NIN_HASH_SECRET is required in production.");
  }

  return createHmac("sha256", secret || "me2u-dev-nin-secret")
    .update(nin.trim())
    .digest("hex");
}

export async function verifyNin(nin: string): Promise<VerifiedNinProfile> {
  const normalizedNin = nin.trim();

  if (!validateNin(normalizedNin)) {
    throw new Error("NIN must be exactly 11 digits.");
  }

  const providerUrl = process.env.NIN_VERIFICATION_API_URL;
  const providerKey = process.env.NIN_VERIFICATION_API_KEY;

  if (providerUrl && providerKey) {
    const controller = new AbortController();
    const timeoutMs = Number(process.env.NIN_VERIFICATION_TIMEOUT_MS || 15_000);
    const timeoutId = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 15_000);

    let response: Response;
    try {
      response = await fetch(providerUrl, {
        method: "POST",
        headers: getProviderHeaders(providerKey),
        body: JSON.stringify(getProviderBody(normalizedNin)),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("NIN verification timed out. Please try again.");
      }

      throw new Error("Unable to reach NIN verification provider.");
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error("NIN verification failed. Please confirm the number and try again.");
    }

    const payload = await response.json();
    const profile = readProviderProfile(payload);

    if (!profile.firstName || !profile.lastName) {
      throw new Error("NIN provider did not return a complete name.");
    }

    return {
      ...profile,
      ninHash: hashNin(normalizedNin),
      ninLast4: normalizedNin.slice(-4),
    };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("NIN verification provider is not configured.");
  }

  const demoProfile = readDemoProfile(normalizedNin);
  if (demoProfile) return demoProfile;

  throw new Error(
    "NIN verification provider is not configured. Use the local demo NIN or add provider credentials.",
  );
}
