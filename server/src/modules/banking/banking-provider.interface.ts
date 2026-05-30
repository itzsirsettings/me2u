export type BankingProviderName = "wema" | "paystack";
export type ProviderTransactionStatus = "successful" | "pending" | "failed" | "reversed";

export type VirtualAccountRequest = {
  userId: string;
  fullName: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  nin?: string | null;
  bvn?: string | null;
};

export type VirtualAccountResult = {
  status: "active" | "pending" | "unavailable" | "not_configured";
  providerReference?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
  bankName?: string | null;
  bankCode?: string | null;
  raw: unknown;
  message?: string;
};

export type InflowNotification = {
  providerReference: string;
  accountNumber: string;
  amount: number;
  currency: string;
  senderName?: string | null;
  senderAccountNumber?: string | null;
  narration?: string | null;
  raw: unknown;
};

export type BillPaymentRequest = {
  reference: string;
  category: string;
  serviceId: string;
  customerId: string;
  amount: number;
  variationCode?: string | null;
  phone?: string;
};

export type ProviderResult = {
  status: ProviderTransactionStatus;
  providerReference: string;
  raw: unknown;
  message?: string;
};

export type TransferRequest = {
  reference: string;
  amount: number;
  bankCode: string;
  accountNumber: string;
  narration: string;
};

export interface BankingProvider {
  readonly name: BankingProviderName;
  isEnabled(): boolean;
  createVirtualAccount(payload: VirtualAccountRequest): Promise<VirtualAccountResult>;
  parseInflowWebhook(rawBody: Buffer, headers: Record<string, string | undefined>): InflowNotification;
  buyBill(payload: BillPaymentRequest): Promise<ProviderResult>;
  transfer(payload: TransferRequest): Promise<ProviderResult>;
  requery(reference: string): Promise<ProviderResult>;
}
