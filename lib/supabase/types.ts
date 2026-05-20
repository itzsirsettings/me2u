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
    | "affiliate_reward";
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
  status: "pending" | "approved" | "rejected";
  processed_by: string | null;
  processed_at: string | null;
  admin_note: string | null;
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
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<WithdrawalRequestRow, "id" | "user_id" | "created_at">>;
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
    };
    CompositeTypes: Record<string, never>;
  };
}
