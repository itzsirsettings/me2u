export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ProfileRow = {
  id: string;
  first_name: string;
  last_name: string;
  username: string | null;
  email: string;
  phone: string | null;
  nin_hash: string | null;
  nin_last4: string | null;
  country_code: string;
  preferred_currency: string;
  preferred_language: string;
  kyc_verified: boolean;
  trust_score: number;
  bank_name: string | null;
  account_number: string | null;
  registration_payment_reference: string | null;
  referral_code: string | null;
  registration_deposit_paid: boolean;
  registration_deposit_amount: number;
  registration_deposit_confirmed_at: string | null;
  welcome_bonus_unlocked_at: string | null;
  referred_by: string | null;
  affiliate_earnings: number;
  partner_offer_consent_at: string | null;
  partner_offer_consent_version: string | null;
  passport_photo_url: string | null;
  role: "user" | "admin";
  transaction_pin: string | null;
  group_lending_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type WalletRow = {
  id: string;
  user_id: string;
  balance: number;
  locked: number;
  updated_at: string;
};

export type TransactionRow = {
  id: string;
  user_id: string;
  type:
    | "deposit"
    | "withdrawal"
    | "loan_disbursed"
    | "loan_repayment"
    | "investment"
    | "repayment_received"
    | "affiliate_reward"
    | "bill_payment"
    | "bill_refund";
  amount: number;
  description: string;
  created_at: string;
};

export type MarketplaceRow = {
  id: string;
  type: "borrow_request" | "lending_offer";
  amount: number;
  rate: number;
  days: number;
  author_id: string;
  author_name: string;
  trust_score: number;
  status: "active" | "funded" | "cancelled";
  boosted_at: string | null;
  boosted_until: string | null;
  boost_fee_amount: number;
  created_at: string;
};

export type LoanFundingSource = "me2u_balance_sheet" | "peer_lender" | "partner_bank";

export type LoanRow = {
  id: string;
  borrower_id: string;
  lender_id: string | null;
  amount: number;
  rate: number;
  days: number;
  role?: "borrower" | "lender";
  funding_source: LoanFundingSource;
  status: "active" | "completed";
  start_date: string;
  due_date: string;
  created_at: string;
};

export type RevenueEventRow = {
  id: string;
  type: "withdrawal_fee" | "marketplace_boost" | "partner_treasury_share" | "partner_referral";
  amount: number;
  user_id: string | null;
  source_id: string | null;
  description: string;
  created_at: string;
};

export type AffiliateRewardRow = {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  amount: number;
  created_at: string;
};

export type PaymentProofRow = {
  id: string;
  user_id: string;
  amount: number;
  reference: string;
  type: "wallet_funding" | "registration_deposit";
  receipt_image_url: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
};

export type WithdrawalRequestRow = {
  id: string;
  user_id: string;
  amount: number;
  fee_amount: number;
  bank_name: string | null;
  account_number: string | null;
  status: "pending" | "processing" | "success" | "failed" | "reversed";
  processed_by: string | null;
  processed_at: string | null;
  admin_note: string | null;
  fee: number;
  net_amount: number;
  bank_code: string | null;
  account_name: string | null;
  paystack_recipient_code: string | null;
  paystack_transfer_code: string | null;
  paystack_reference: string | null;
  created_at: string;
  updated_at: string;
};

export type BillCategoryRow = {
  id: string;
  name: string;
  slug: "airtime" | "data" | "electricity" | "cable" | string;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
};

export type BillProductRow = {
  id: string;
  category_id: string;
  provider: "vtpass" | "flutterwave" | "wema";
  service_id: string;
  variation_code: string | null;
  network: string | null;
  name: string;
  cost_price: number;
  selling_price: number;
  commission: number;
  is_active: boolean;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

export type BillTransactionRow = {
  id: string;
  user_id: string;
  wallet_id: string;
  product_id: string | null;
  reference: string;
  idempotency_key: string | null;
  provider: "vtpass" | "flutterwave" | "wema";
  provider_reference: string | null;
  category: string;
  service_id: string;
  variation_code: string | null;
  network: string | null;
  customer_identifier: string;
  amount: number;
  cost_price: number;
  selling_price: number;
  profit: number;
  status: "initiated" | "debited" | "pending" | "successful" | "failed" | "reversed" | "refunded";
  provider_response: Json | null;
  failure_reason: string | null;
  requery_count: number;
  next_requery_at: string | null;
  completed_at: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WalletLedgerRow = {
  id: string;
  user_id: string;
  wallet_id: string;
  transaction_type: "credit" | "debit" | "refund" | "reversal";
  source: "deposit" | "loan" | "bill_payment" | "repayment" | "admin_adjustment" | "withdrawal" | "referral" | "bank_transfer" | "transfer";
  amount: number;
  balance_before: number;
  balance_after: number;
  reference: string;
  description: string;
  metadata: Json;
  created_at: string;
};

export type VirtualAccountRow = {
  id: string;
  user_id: string;
  provider: string;
  provider_reference: string | null;
  account_name: string | null;
  account_number: string | null;
  bank_name: string | null;
  bank_code: string | null;
  currency: string;
  status: string;
  request_payload: Json;
  response_payload: Json;
  created_at: string;
  updated_at: string;
};

export type WalletInflowRow = {
  id: string;
  user_id: string;
  wallet_id: string | null;
  virtual_account_id: string | null;
  provider: string;
  provider_reference: string;
  amount: number;
  currency: string;
  status: string;
  sender_name: string | null;
  sender_account_number: string | null;
  narration: string | null;
  credited_at: string | null;
  raw_payload: Json;
  created_at: string;
  updated_at: string;
};

export type BankTransferRow = {
  id: string;
  user_id: string;
  wallet_id: string | null;
  provider: string;
  reference: string;
  provider_reference: string | null;
  amount: number;
  bank_code: string;
  account_number: string;
  account_name: string | null;
  narration: string | null;
  status: string;
  failure_reason: string | null;
  provider_response: Json | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PaystackDedicatedAccountRow = {
  id: string;
  user_id: string;
  customer_code: string | null;
  dedicated_account_id: string | null;
  account_name: string | null;
  account_number: string | null;
  bank_name: string | null;
  bank_slug: string | null;
  assignment_payload: Json | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export type SavingsGoalRow = {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  locked: boolean;
  status: "active" | "completed" | "withdrawn";
  created_at: string;
  updated_at: string;
};

export type MerchantDealRow = {
  id: string;
  merchant_name: string;
  category: string;
  title: string;
  description: string;
  discount_percent: number;
  country_code: string;
  active: boolean;
  created_at: string;
};

export type MerchantDealClaimRow = {
  id: string;
  user_id: string;
  deal_id: string;
  status: "claimed" | "redeemed" | "expired";
  created_at: string;
};

export type LearningProgressRow = {
  user_id: string;
  lesson_key: string;
  completed_at: string;
};

export type SecurityEventRow = {
  id: string;
  user_id: string;
  type:
    | "wallet_frozen"
    | "wallet_unfrozen"
    | "fraud_reported"
    | "recovery_requested"
    | "trusted_device_reviewed"
    | "session_reviewed"
    | "mfa_started";
  detail: string | null;
  metadata: Json;
  created_at: string;
};

export type UserSecuritySettingsRow = {
  user_id: string;
  wallet_frozen: boolean;
  trusted_device_label: string | null;
  updated_at: string;
};

export type SupportBeneficiaryRow = {
  id: string;
  sponsor_id: string;
  beneficiary_name: string;
  relationship: string;
  purpose: string;
  support_mode: "repayment" | "non_repayment";
  verified: boolean;
  last_support_amount: number;
  spending_proof_url: string | null;
  created_at: string;
  updated_at: string;
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Omit<ProfileRow, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ProfileRow, "id" | "created_at" | "updated_at">> & {
          updated_at?: string;
        };
        Relationships: [];
      };
      wallets: {
        Row: WalletRow;
        Insert: {
          id?: string;
          user_id: string;
          balance?: number;
          locked?: number;
          updated_at?: string;
        };
        Update: Partial<Omit<WalletRow, "user_id">>;
        Relationships: [];
      };
      transactions: {
        Row: TransactionRow;
        Insert: {
          id?: string;
          user_id: string;
          type: TransactionRow["type"];
          amount: number;
          description: string;
          created_at?: string;
        };
        Update: Partial<Omit<TransactionRow, "id" | "user_id">>;
        Relationships: [];
      };
      marketplace_items: {
        Row: MarketplaceRow;
        Insert: {
          id?: string;
          type: MarketplaceRow["type"];
          amount: number;
          rate: number;
          days: number;
          author_id: string;
          author_name: string;
          trust_score: number;
          status?: MarketplaceRow["status"];
          boosted_at?: string | null;
          boosted_until?: string | null;
          boost_fee_amount?: number;
          created_at?: string;
        };
        Update: Partial<Omit<MarketplaceRow, "id" | "author_id" | "created_at">>;
        Relationships: [];
      };
      loans: {
        Row: LoanRow;
        Insert: {
          id?: string;
          borrower_id: string;
          lender_id?: string | null;
          amount: number;
          rate: number;
          days: number;
          status?: LoanRow["status"];
          funding_source?: LoanFundingSource;
          start_date?: string;
          due_date: string;
          created_at?: string;
        };
        Update: Partial<Omit<LoanRow, "id" | "borrower_id" | "lender_id" | "created_at">>;
        Relationships: [];
      };
      revenue_events: {
        Row: RevenueEventRow;
        Insert: {
          id?: string;
          type: RevenueEventRow["type"];
          amount: number;
          user_id?: string | null;
          source_id?: string | null;
          description: string;
          created_at?: string;
        };
        Update: Partial<Omit<RevenueEventRow, "id" | "created_at">>;
        Relationships: [];
      };
      affiliate_rewards: {
        Row: AffiliateRewardRow;
        Insert: {
          id?: string;
          referrer_id: string;
          referred_user_id: string;
          amount: number;
          created_at?: string;
        };
        Update: Partial<Omit<AffiliateRewardRow, "id" | "created_at">>;
        Relationships: [];
      };
      payment_proofs: {
        Row: PaymentProofRow;
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          reference: string;
          type: PaymentProofRow["type"];
          receipt_image_url: string;
          status?: PaymentProofRow["status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<PaymentProofRow, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      withdrawal_requests: {
        Row: WithdrawalRequestRow;
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          fee_amount?: number;
          bank_name?: string | null;
          account_number?: string | null;
          status?: WithdrawalRequestRow["status"];
          processed_by?: string | null;
          processed_at?: string | null;
          admin_note?: string | null;
          fee?: number;
          net_amount?: number;
          bank_code?: string | null;
          account_name?: string | null;
          paystack_recipient_code?: string | null;
          paystack_transfer_code?: string | null;
          paystack_reference?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<WithdrawalRequestRow, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      bill_categories: {
        Row: BillCategoryRow;
        Insert: {
          id?: string;
          name: string;
          slug: string;
          status?: BillCategoryRow["status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<BillCategoryRow, "id" | "created_at">>;
        Relationships: [];
      };
      bill_products: {
        Row: BillProductRow;
        Insert: {
          id?: string;
          category_id: string;
          provider?: BillProductRow["provider"];
          service_id: string;
          variation_code?: string | null;
          network?: string | null;
          name: string;
          cost_price?: number;
          selling_price?: number;
          commission?: number;
          is_active?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<BillProductRow, "id" | "created_at">>;
        Relationships: [];
      };
      bill_transactions: {
        Row: BillTransactionRow;
        Insert: {
          id?: string;
          user_id: string;
          wallet_id: string;
          product_id?: string | null;
          reference: string;
          idempotency_key?: string | null;
          provider?: BillTransactionRow["provider"];
          provider_reference?: string | null;
          category: string;
          service_id: string;
          variation_code?: string | null;
          network?: string | null;
          customer_identifier: string;
          amount: number;
          cost_price?: number;
          selling_price: number;
          profit?: number;
          status?: BillTransactionRow["status"];
          provider_response?: Json | null;
          failure_reason?: string | null;
          requery_count?: number;
          next_requery_at?: string | null;
          completed_at?: string | null;
          refunded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<BillTransactionRow, "id" | "user_id" | "wallet_id" | "created_at">>;
        Relationships: [];
      };
      wallet_ledger: {
        Row: WalletLedgerRow;
        Insert: {
          id?: string;
          user_id: string;
          wallet_id: string;
          transaction_type: WalletLedgerRow["transaction_type"];
          source: WalletLedgerRow["source"];
          amount: number;
          balance_before: number;
          balance_after: number;
          reference: string;
          description: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Omit<WalletLedgerRow, "id" | "user_id" | "wallet_id" | "created_at">>;
        Relationships: [];
      };
      virtual_accounts: {
        Row: VirtualAccountRow;
        Insert: {
          id?: string;
          user_id: string;
          provider?: string;
          provider_reference?: string | null;
          account_name?: string | null;
          account_number?: string | null;
          bank_name?: string | null;
          bank_code?: string | null;
          currency?: string;
          status?: string;
          request_payload?: Json;
          response_payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<VirtualAccountRow, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      wallet_inflows: {
        Row: WalletInflowRow;
        Insert: {
          id?: string;
          user_id: string;
          wallet_id?: string | null;
          virtual_account_id?: string | null;
          provider?: string;
          provider_reference: string;
          amount: number;
          currency?: string;
          status?: string;
          sender_name?: string | null;
          sender_account_number?: string | null;
          narration?: string | null;
          credited_at?: string | null;
          raw_payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<WalletInflowRow, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      bank_transfers: {
        Row: BankTransferRow;
        Insert: {
          id?: string;
          user_id: string;
          wallet_id?: string | null;
          provider?: string;
          reference: string;
          provider_reference?: string | null;
          amount: number;
          bank_code: string;
          account_number: string;
          account_name?: string | null;
          narration?: string | null;
          status?: string;
          failure_reason?: string | null;
          provider_response?: Json | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<BankTransferRow, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      paystack_dedicated_accounts: {
        Row: PaystackDedicatedAccountRow;
        Insert: {
          id?: string;
          user_id: string;
          customer_code?: string | null;
          dedicated_account_id?: string | null;
          account_name?: string | null;
          account_number?: string | null;
          bank_name?: string | null;
          bank_slug?: string | null;
          assignment_payload?: Json | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<PaystackDedicatedAccountRow, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      notifications: {
        Row: NotificationRow;
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: Partial<Omit<NotificationRow, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      savings_goals: {
        Row: SavingsGoalRow;
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          target_amount: number;
          current_amount?: number;
          locked?: boolean;
          status?: SavingsGoalRow["status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<SavingsGoalRow, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      merchant_deals: {
        Row: MerchantDealRow;
        Insert: {
          id?: string;
          merchant_name: string;
          category: string;
          title: string;
          description: string;
          discount_percent?: number;
          country_code?: string;
          active?: boolean;
          created_at?: string;
        };
        Update: Partial<Omit<MerchantDealRow, "id" | "created_at">>;
        Relationships: [];
      };
      merchant_deal_claims: {
        Row: MerchantDealClaimRow;
        Insert: {
          id?: string;
          user_id: string;
          deal_id: string;
          status?: MerchantDealClaimRow["status"];
          created_at?: string;
        };
        Update: Partial<Omit<MerchantDealClaimRow, "id" | "user_id" | "deal_id" | "created_at">>;
        Relationships: [];
      };
      learning_progress: {
        Row: LearningProgressRow;
        Insert: {
          user_id: string;
          lesson_key: string;
          completed_at?: string;
        };
        Update: Partial<Omit<LearningProgressRow, "user_id" | "lesson_key">>;
        Relationships: [];
      };
      security_events: {
        Row: SecurityEventRow;
        Insert: {
          id?: string;
          user_id: string;
          type: SecurityEventRow["type"];
          detail?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Omit<SecurityEventRow, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      user_security_settings: {
        Row: UserSecuritySettingsRow;
        Insert: {
          user_id: string;
          wallet_frozen?: boolean;
          trusted_device_label?: string | null;
          updated_at?: string;
        };
        Update: Partial<Omit<UserSecuritySettingsRow, "user_id">>;
        Relationships: [];
      };
      support_beneficiaries: {
        Row: SupportBeneficiaryRow;
        Insert: {
          id?: string;
          sponsor_id: string;
          beneficiary_name: string;
          relationship?: string;
          purpose?: string;
          support_mode?: SupportBeneficiaryRow["support_mode"];
          verified?: boolean;
          last_support_amount?: number;
          spending_proof_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<SupportBeneficiaryRow, "id" | "sponsor_id" | "created_at">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      me2u_fund_wallet: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_reference: string;
        };
        Returns: undefined;
      };
      me2u_withdraw_wallet: {
        Args: {
          p_user_id: string;
          p_amount: number;
        };
        Returns: undefined;
      };
      me2u_create_marketplace_item: {
        Args: {
          p_user_id: string;
          p_type: MarketplaceRow["type"];
          p_amount: number;
          p_rate: number;
          p_days: number;
          p_boost?: boolean;
        };
        Returns: undefined;
      };
      me2u_unlock_welcome_bonus: {
        Args: {
          p_user_id: string;
        };
        Returns: undefined;
      };
      me2u_accept_marketplace_item: {
        Args: {
          p_user_id: string;
          p_item_id: string;
        };
        Returns: undefined;
      };
      me2u_repay_loan: {
        Args: {
          p_user_id: string;
          p_loan_id: string;
        };
        Returns: undefined;
      };
      me2u_request_platform_loan: {
        Args: {
          p_user_id: string;
          p_amount: number | null;
        };
        Returns: undefined;
      };
      me2u_confirm_registration_deposit: {
        Args: {
          p_user_id: string;
          p_reference: string;
        };
        Returns: undefined;
      };
      admin_approve_payment_proof: {
        Args: {
          p_proof_id: string;
        };
        Returns: undefined;
      };
      admin_reject_payment_proof: {
        Args: {
          p_proof_id: string;
        };
        Returns: undefined;
      };
      admin_approve_withdrawal_request: {
        Args: {
          p_request_id: string;
        };
        Returns: undefined;
      };
      admin_reject_withdrawal_request: {
        Args: {
          p_request_id: string;
        };
        Returns: undefined;
      };
      me2u_initiate_paystack_withdrawal: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_fee: number;
          p_net_amount: number;
          p_bank_code: string;
          p_account_number: string;
          p_account_name: string;
        };
        Returns: string;
      };
      me2u_confirm_withdrawal_success: {
        Args: {
          p_request_id: string;
          p_transfer_code: string;
          p_reference: string;
        };
        Returns: undefined;
      };
      me2u_handle_withdrawal_failure: {
        Args: {
          p_request_id: string;
          p_transfer_code: string;
          p_reason?: string;
        };
        Returns: undefined;
      };
      me2u_increment_balance: {
        Args: {
          p_user_id: string;
          p_amount: number;
        };
        Returns: undefined;
      };
      me2u_record_referral: {
        Args: {
          p_referrer_id: string;
          p_referee_id: string;
        };
        Returns: undefined;
      };
      me2u_pay_bill: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_service_label: string;
          p_detail?: string | null;
        };
        Returns: undefined;
      };
      me2u_create_bill_debit: {
        Args: {
          p_user_id: string;
          p_product_id: string;
          p_reference: string;
          p_idempotency_key: string;
          p_amount: number;
          p_customer_identifier: string;
        };
        Returns: BillTransactionRow;
      };
      me2u_refund_bill_transaction: {
        Args: {
          p_reference: string;
          p_reason?: string | null;
        };
        Returns: BillTransactionRow;
      };
      me2u_credit_wallet_funding: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_reference: string;
          p_description?: string;
        };
        Returns: WalletLedgerRow;
      };
      me2u_get_referral_stats: {
        Args: {
          p_user_id: string;
        };
        Returns: Json;
      };
      me2u_get_referral_details: {
        Args: {
          p_user_id: string;
        };
        Returns: {
          referee_id: string;
          referee_name: string;
          referee_email: string;
          referee_trust_score: number;
          referee_kyc_verified: boolean;
          signed_up_at: string;
          first_withdrawal_rewarded: boolean;
          first_repayment_rewarded: boolean;
          pending_rewards: string;
        }[];
      };
    };
    Enums: {
      transaction_type: TransactionRow["type"];
      marketplace_item_type: MarketplaceRow["type"];
      marketplace_status: MarketplaceRow["status"];
      loan_status: LoanRow["status"];
      loan_funding_source: LoanFundingSource;
      payment_proof_status: PaymentProofRow["status"];
      payment_proof_type: PaymentProofRow["type"];
      revenue_event_type: RevenueEventRow["type"];
      withdrawal_request_status: WithdrawalRequestRow["status"];
      bill_record_status: BillCategoryRow["status"];
      bill_provider: BillProductRow["provider"];
      bill_transaction_status: BillTransactionRow["status"];
      wallet_ledger_transaction_type: WalletLedgerRow["transaction_type"];
      wallet_ledger_source: WalletLedgerRow["source"];
    };
    CompositeTypes: Record<string, never>;
  };
}
