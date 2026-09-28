export type PaystackRegistrationTransfer = {
  reference: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  transactionReference: string;
  expiresAt: string;
  status: "pending" | "success" | "failed" | "expired" | "review" | "initializing";
};

export function readPaystackRegistrationTransfer(
  value: unknown,
): PaystackRegistrationTransfer | null {
  if (typeof value !== "object" || value === null || !("payment" in value)) return null;
  const payment = value.payment;
  if (typeof payment !== "object" || payment === null) return null;
  const fields = payment as Record<string, unknown>;
  if (
    typeof fields.reference !== "string" ||
    typeof fields.accountName !== "string" ||
    typeof fields.accountNumber !== "string" ||
    typeof fields.bankName !== "string" ||
    typeof fields.transactionReference !== "string" ||
    typeof fields.expiresAt !== "string" ||
    typeof fields.status !== "string" ||
    !["pending", "success", "failed", "expired", "review", "initializing"].includes(
      fields.status,
    )
  ) {
    return null;
  }
  return {
    reference: fields.reference,
    accountName: fields.accountName,
    accountNumber: fields.accountNumber,
    bankName: fields.bankName,
    transactionReference: fields.transactionReference,
    expiresAt: fields.expiresAt,
    status: fields.status as PaystackRegistrationTransfer["status"],
  };
}

export function readPaystackRegistrationTransferError(
  value: unknown,
  httpStatus: number,
): string {
  if (typeof value !== "object" || value === null) {
    return httpStatus >= 200 && httpStatus < 300
      ? "Paystack returned a response without usable transfer details. Contact support before retrying."
      : "Unable to start Paystack Transfer.";
  }
  const payload = value as Record<string, unknown>;
  const message = typeof payload.error === "string" ? payload.error : "";
  const reference = typeof payload.reference === "string" ? payload.reference : "";
  if (httpStatus === 202) {
    const fallback =
      "Paystack started the transfer, but its details are still being prepared. Refresh this page before trying again.";
    const recoveryMessage = message || fallback;
    return reference && !recoveryMessage.includes(reference)
      ? `${recoveryMessage} Reference: ${reference}.`
      : recoveryMessage;
  }
  if (message) {
    return reference && !message.includes(reference)
      ? `${message} Reference: ${reference}.`
      : message;
  }
  return httpStatus >= 200 && httpStatus < 300
    ? "Paystack returned a response without usable transfer details. Contact support before retrying."
    : "Unable to start Paystack Transfer.";
}
