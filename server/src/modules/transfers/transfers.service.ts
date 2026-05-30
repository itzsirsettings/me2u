import { BadRequestException, Injectable } from "@nestjs/common";
import { SupabaseService, type AuthenticatedRequestUser } from "../../common/supabase.service";
import { WemaProvider } from "../banking/wema.provider";

function transferReference() {
  return `M2UT${Date.now()}${Math.floor(Math.random() * 100_000).toString().padStart(5, "0")}`;
}

@Injectable()
export class TransfersService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly wema: WemaProvider,
  ) {}

  async list(user: AuthenticatedRequestUser) {
    const { data, error } = await this.supabase.admin
      .from("bank_transfers")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async resolveAccount() {
    return {
      ok: false,
      status: "not_configured",
      message: "Wema account resolution will be enabled after Wema provides final transfer documentation.",
    };
  }

  async send(user: AuthenticatedRequestUser, body: Record<string, unknown>) {
    const amount = Number(body.amount || 0);
    const bankCode = String(body.bankCode || "").trim();
    const accountNumber = String(body.accountNumber || "").replace(/\D/g, "");
    const narration = String(body.narration || "Me2U transfer").trim().slice(0, 120);

    if (!this.wema.isEnabled() || process.env.WEMA_TRANSFERS_ENABLED !== "true") {
      return {
        ok: false,
        status: "not_configured",
        message: "Wema transfers are not enabled yet. Enable only after atomic transfer debit rules are finalized.",
      };
    }
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException("Amount must be greater than zero.");
    if (!bankCode || !/^\d{10}$/.test(accountNumber)) throw new BadRequestException("Enter valid bank and account details.");

    const reference = transferReference();
    const result = await this.wema.transfer({
      reference,
      amount,
      bankCode,
      accountNumber,
      narration,
    });

    const { data: wallet } = await this.supabase.admin.from("wallets").select("id").eq("user_id", user.id).maybeSingle();
    const { data, error } = await this.supabase.admin
      .from("bank_transfers")
      .insert({
        user_id: user.id,
        wallet_id: wallet?.id || null,
        provider: "wema",
        reference,
        provider_reference: result.providerReference,
        amount,
        bank_code: bankCode,
        account_number: accountNumber,
        narration,
        status: result.status,
        provider_response: result.raw as any,
        completed_at: result.status === "successful" ? new Date().toISOString() : null,
      })
      .select("*")
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async requery(reference: string) {
    if (!this.wema.isEnabled() || process.env.WEMA_TRANSFERS_ENABLED !== "true") {
      return {
        ok: false,
        status: "not_configured",
        message: "Wema transfer requery is not enabled yet.",
      };
    }

    const result = await this.wema.requery(reference);
    const { data, error } = await this.supabase.admin
      .from("bank_transfers")
      .update({
        status: result.status,
        provider_response: result.raw as any,
        completed_at: result.status === "successful" ? new Date().toISOString() : null,
      })
      .eq("reference", reference)
      .select("*")
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    return data || result;
  }
}
