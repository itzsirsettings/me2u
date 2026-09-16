export type BillProviderName = "vtpass" | "flutterwave" | "wema";
export type ProviderTransactionStatus = "successful" | "pending" | "failed" | "reversed";

export type BillPurchaseRequest = {
  reference: string;
  serviceId: string;
  variationCode?: string | null;
  amount: number;
  customerIdentifier: string;
  phone?: string;
};

export type BillProviderResult = {
  status: ProviderTransactionStatus;
  providerReference: string;
  raw: unknown;
  message?: string;
};

export interface BillProvider {
  readonly name: BillProviderName;
  listProducts(serviceId: string): Promise<unknown>;
  validateCustomer(params: BillPurchaseRequest): Promise<BillProviderResult>;
  purchase(params: BillPurchaseRequest): Promise<BillProviderResult>;
  requery(providerReference: string): Promise<BillProviderResult>;
  getBalance(): Promise<unknown>;
}
