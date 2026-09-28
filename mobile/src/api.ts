import { API_BASE_URL } from './config';

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  balance: number;
  locked: number;
  kycVerified: boolean;
  registrationDepositPaid: boolean;
};

export type TransferDetails = {
  reference: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  transactionReference: string;
  expiresAt: string;
  status: string;
};

export type LoanSummary = {
  id: string;
  amount: number | string;
  rate?: number | string;
  status: string;
  borrower_id?: string;
  lender_id?: string;
  due_date?: string | null;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly reference?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  token?: string,
  init: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
      signal: init.signal ?? controller.signal,
    });
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
      reference?: string;
    };
    if (!response.ok) {
      throw new ApiError(
        body.error || body.message || 'The request could not be completed.',
        response.status,
        body.reference,
      );
    }
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(
        'The request timed out. Check your connection and try again.',
      );
    }
    throw new ApiError(
      'Me2U could not be reached. Check your internet connection and try again.',
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function login(email: string, password: string) {
  return request<{
    accessToken: string;
    tokenType: 'Bearer';
    expiresIn: number;
  }>('/api/auth/native/login', undefined, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getProfile(token: string) {
  return request<{ user: UserProfile }>('/api/auth/me', token);
}

export async function getLoans(token: string) {
  return request<{ loans: LoanSummary[] }>('/api/auth/me/loans', token);
}

export async function repayLoan(token: string, loanId: string) {
  return request<{ success: boolean; repayment_amount: number }>(
    '/api/loans/repay',
    token,
    {
      method: 'POST',
      body: JSON.stringify({ loanId }),
    },
  );
}

export async function createRegistrationTransfer(token: string) {
  return request<{ payment: TransferDetails }>(
    '/api/onboarding/registration-deposit/paystack',
    token,
    {
      method: 'POST',
      body: '{}',
    },
  );
}

export async function getDeletionRequest(token: string) {
  return request<{ request: DeletionRequest | null }>(
    '/api/account/deletion',
    token,
  );
}

export type DeletionRequest = {
  id: string;
  status: 'requested' | 'in_review';
  requestedAt: string;
  estimatedCompletionAt: string;
};

export async function createDeletionRequest(
  token: string,
  currentPassword: string,
) {
  return request<{ request: DeletionRequest; message: string }>(
    '/api/account/deletion',
    token,
    {
      method: 'POST',
      body: JSON.stringify({ currentPassword, confirmation: 'DELETE' }),
    },
  );
}

export async function logout(token: string) {
  return request<{ ok: boolean }>('/api/auth/logout', token, {
    method: 'POST',
    body: '{}',
  });
}
