const AMOUNT_SCALE = 100_000_000n;
const CURRENCY_MINOR_DIVISOR = 100_000_000_000_000n;
const MAX_DECIMAL_INPUT_LENGTH = 32;
const SEPOLIA_CHAIN_ID = 11_155_111;

function parsePositiveDecimal(value, label) {
  const normalized = String(value).trim();
  if (
    normalized.length === 0 ||
    normalized.length > MAX_DECIMAL_INPUT_LENGTH ||
    !/^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/.test(normalized)
  ) {
    throw new RangeError(`${label} must be a positive decimal with up to 8 decimal places.`);
  }

  const [whole, fraction = ""] = normalized.split(".");
  const units = BigInt(whole) * AMOUNT_SCALE + BigInt(fraction.padEnd(8, "0") || "0");
  if (units <= 0n) {
    throw new RangeError(`${label} must be greater than zero.`);
  }

  return units;
}

export function calculateMarketScenario({ tokenAmount, rate, side }) {
  if (side !== "buy" && side !== "sell") {
    throw new RangeError("Choose whether this scenario is a buy or sell.");
  }

  const amountUnits = parsePositiveDecimal(tokenAmount, "Token amount");
  const rateUnits = parsePositiveDecimal(rate, "Test rate");
  const product = amountUnits * rateUnits;
  const currencyMinorUnits = (product + CURRENCY_MINOR_DIVISOR / 2n) / CURRENCY_MINOR_DIVISOR;

  return { currencyMinorUnits, side };
}

export function formatCurrencyMinorUnits(minorUnits) {
  const value = typeof minorUnits === "bigint" ? minorUnits : BigInt(minorUnits);
  const major = value / 100n;
  const minor = (value % 100n).toString().padStart(2, "0");
  return `${major.toLocaleString("en-US")}.${minor}`;
}

export function isSepoliaChainId(value) {
  try {
    const parsed = typeof value === "bigint" ? Number(value) : Number(value);
    return Number.isSafeInteger(parsed) && parsed === SEPOLIA_CHAIN_ID;
  } catch {
    return false;
  }
}

export function formatWalletError(error, fallback) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.length > 240 ? `${error.message.slice(0, 237)}...` : error.message;
  }
  return fallback;
}
