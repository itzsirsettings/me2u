import { BadRequestException, Injectable } from "@nestjs/common";
import { SupabaseService, type AuthenticatedRequestUser } from "../../common/supabase.service";
import { WemaProvider } from "./wema.provider";

function fullName(profile: any) {
  return [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
}

function isMissingWemaSchema(error: { message?: string } | null | undefined) {
  return /virtual_accounts|wallet_inflows|schema cache|could not find/i.test(error?.message || "");
}

@Injectable()
export class BankingService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly wema: WemaProvider,
  ) {}

  async getVirtualAccount(user: AuthenticatedRequestUser) {
    const { data: existing, error } = await this.supabase.admin
      .from("virtual_accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "wema")
      .maybeSingle();

    if (isMissingWemaSchema(error)) {
      return {
        status: "migration_pending",
        message: "Apply the Wema banking rails migration before virtual accounts can be created.",
      };
    }
    if (error) throw new BadRequestException(error.message);
    if (existing) return existing;

    return this.createVirtualAccountForUser(user.id);
  }

  async createVirtualAccountForUser(userId: string) {
    const { data: profile, error: profileError } = await this.supabase.admin
      .from("profiles")
      .select("id, first_name, last_name, email, phone, kyc_verified")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) throw new BadRequestException(profileError.message);
    if (!profile) throw new BadRequestException("Profile not found.");
    if (!profile.kyc_verified) {
      return this.saveVirtualAccount(userId, {
        status: "pending",
        raw: {},
        message: "Complete KYC/NIN before Wema virtual account creation.",
      });
    }

    const result = await this.wema.createVirtualAccount({
      userId,
      fullName: fullName(profile),
      firstName: profile.first_name,
      lastName: profile.last_name,
      email: profile.email,
      phone: profile.phone || "",
      nin: null,
    });

    return this.saveVirtualAccount(userId, result);
  }

  private async saveVirtualAccount(userId: string, result: any) {
    const row = {
      user_id: userId,
      provider: "wema",
      provider_reference: result.providerReference || null,
      account_name: result.accountName || null,
      account_number: result.accountNumber || null,
      bank_name: result.bankName || null,
      bank_code: result.bankCode || null,
      status: result.status || "pending",
      response_payload: result.raw || {},
    };

    const { data, error } = await this.supabase.admin
      .from("virtual_accounts")
      .upsert(row, { onConflict: "provider,user_id" })
      .select("*")
      .single();

    if (isMissingWemaSchema(error)) {
      return {
        ...row,
        message: "Apply the Wema banking rails migration before virtual accounts can be persisted.",
      };
    }
    if (error) throw new BadRequestException(error.message);
    return {
      ...data,
      message: result.message,
    };
  }

  async processWemaInflow(rawBody: Buffer, headers: Record<string, string | undefined>) {
    const notification = this.wema.parseInflowWebhook(rawBody, headers);

    await this.supabase.admin.from("provider_webhooks").insert({
      provider: "wema",
      event_type: "wallet_inflow",
      reference: notification.providerReference,
      payload: notification.raw as any,
      processed: false,
    });

    const { data: virtualAccount, error: accountError } = await this.supabase.admin
      .from("virtual_accounts")
      .select("*")
      .eq("provider", "wema")
      .eq("account_number", notification.accountNumber)
      .maybeSingle();

    if (accountError) throw new BadRequestException(accountError.message);
    if (!virtualAccount) throw new BadRequestException("Virtual account was not found.");

    const { data: wallet, error: walletError } = await this.supabase.admin
      .from("wallets")
      .select("id")
      .eq("user_id", virtualAccount.user_id)
      .maybeSingle();

    if (walletError) throw new BadRequestException(walletError.message);
    if (!wallet) throw new BadRequestException("Wallet was not found.");

    const { data: existingInflow, error: existingError } = await this.supabase.admin
      .from("wallet_inflows")
      .select("*")
      .eq("provider", "wema")
      .eq("provider_reference", notification.providerReference)
      .maybeSingle();

    if (existingError) throw new BadRequestException(existingError.message);
    if (existingInflow?.status === "credited") return { ok: true, duplicate: true };

    const { error: inflowError } = await this.supabase.admin.from("wallet_inflows").upsert(
      {
        user_id: virtualAccount.user_id,
        wallet_id: wallet.id,
        virtual_account_id: virtualAccount.id,
        provider: "wema",
        provider_reference: notification.providerReference,
        amount: notification.amount,
        currency: notification.currency,
        status: "verified",
        sender_name: notification.senderName,
        sender_account_number: notification.senderAccountNumber,
        narration: notification.narration,
        raw_payload: notification.raw as any,
      },
      { onConflict: "provider,provider_reference" },
    );

    if (inflowError) throw new BadRequestException(inflowError.message);

    const ledgerReference = `wema:${notification.providerReference}`;
    const { error: creditError } = await this.supabase.admin.rpc("me2u_credit_wallet_inflow", {
      p_user_id: virtualAccount.user_id,
      p_amount: notification.amount,
      p_reference: ledgerReference,
      p_description: "Wema virtual account wallet funding",
      p_metadata: {
        virtual_account_id: virtualAccount.id,
        provider_reference: notification.providerReference,
      },
    });

    if (creditError) throw new BadRequestException(creditError.message);

    await this.supabase.admin
      .from("wallet_inflows")
      .update({ status: "credited", credited_at: new Date().toISOString() })
      .eq("provider", "wema")
      .eq("provider_reference", notification.providerReference);

    await this.supabase.admin
      .from("provider_webhooks")
      .update({ processed: true })
      .eq("provider", "wema")
      .eq("reference", notification.providerReference);

    return { ok: true };
  }

  async requeryInflow() {
    return {
      ok: false,
      status: "not_configured",
      message: "Wema inflow requery endpoint will be enabled after Wema provides the final requery documentation.",
    };
  }
}
