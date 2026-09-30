export type TradeSide = "buy" | "sell";

export interface MarketScenario {
  currencyMinorUnits: bigint;
  side: TradeSide;
}

export function calculateMarketScenario(input: {
  tokenAmount: string;
  rate: string;
  side: TradeSide;
}): MarketScenario;

export function formatCurrencyMinorUnits(minorUnits: bigint | string | number): string;
export function isSepoliaChainId(value: unknown): boolean;
export function formatWalletError(error: unknown, fallback: string): string;
