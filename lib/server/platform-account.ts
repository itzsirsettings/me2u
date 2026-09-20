export type PlatformAccountDetails = {
  bank: string;
  name: string;
  number: string;
};

/**
 * Reads the shared registration-deposit account only on the server. The
 * legacy public variable names are supported during the configuration
 * transition, but must never be imported by a client component.
 */
export function getPlatformAccountDetails(): PlatformAccountDetails | null {
  const bank = (
    process.env.PLATFORM_ACCOUNT_BANK ?? process.env.NEXT_PUBLIC_PLATFORM_ACCOUNT_BANK
  )?.trim();
  const name = (
    process.env.PLATFORM_ACCOUNT_NAME ?? process.env.NEXT_PUBLIC_PLATFORM_ACCOUNT_NAME
  )?.trim();
  const number = (
    process.env.PLATFORM_ACCOUNT_NUMBER ?? process.env.NEXT_PUBLIC_PLATFORM_ACCOUNT_NUMBER
  )?.trim();

  if (!bank || !name || !number) return null;
  return { bank, name, number };
}
