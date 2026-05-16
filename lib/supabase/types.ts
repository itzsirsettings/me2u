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
  kyc_verified: boolean;
  trust_score: number;
  bank_name: string | null;
  account_number: string | null;
  registration_payment_reference: string | null;
  referral_code: string | null;
  registration_deposit_paid: boolean;
  registration_deposit_amount: number;
  registration_deposit_confirmed_at: string | null;
  referred_by: string | null;
  affiliate_earnings: number;
  passport_photo_url: string | null;
  role: "user" | "admin";
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
  created_at: string;
};

export type LoanRow = {
  id: string;
  borrower_id: string;
  lender_id: string | null;
  amount: number;
  rate: number;
  days: number;
  role?: "borrower" | "lender";
  status: "active" | "completed";
  start_date: string;
  due_date: string;
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
          start_date?: string;
          due_date: string;
          created_at?: string;
        };
        Update: Partial<Omit<LoanRow, "id" | "borrower_id" | "lender_id" | "created_at">>;
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
    };
    Enums: {
      transaction_type: TransactionRow["type"];
      marketplace_item_type: MarketplaceRow["type"];
      marketplace_status: MarketplaceRow["status"];
      loan_status: LoanRow["status"];
      payment_proof_status: PaymentProofRow["status"];
      payment_proof_type: PaymentProofRow["type"];
    };
    CompositeTypes: Record<string, never>;
  };
}
