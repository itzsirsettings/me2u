import {
  clearSessionState,
  toErrorMessage,
  toLoan,
  toMarketplaceItem,
  toNotification,
  toTransaction,
} from "./helpers";
import type { AppStore, LoanApiRow, StoreSlice, ActionResult, User } from "./types";

import type { MarketplaceRow, NotificationRow, TransactionRow } from "@/lib/database/types";
import { authorizedFetch, isAbortError } from "@/lib/fetch";
import { clearToken, saveCsrfHeaderValue } from "@/lib/railway/token";

let loadCurrentUserInflight: Promise<ActionResult> | null = null;
let loadCurrentUserAbort: (() => void) | null = null;

type AuthSlice = Pick<
  AppStore,
  | "user"
  | "isAuthenticated"
  | "isLoading"
  | "initialize"
  | "loadCurrentUser"
  | "signInWithPassword"
  | "logout"
>;

async function readJsonObject(response: Response): Promise<Record<string, unknown>> {
  const value: unknown = await response.json().catch(() => ({}));
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

export const createAuthSlice: StoreSlice<AuthSlice> = (set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  initialize: async () => {
    await get().loadCurrentUser();
  },
  loadCurrentUser: async () => {
    if (loadCurrentUserInflight) return loadCurrentUserInflight;
    if (loadCurrentUserAbort) {
      try {
        loadCurrentUserAbort();
      } catch {
        /* The superseded request may already be settled. */
      }
    }
    const abortCtrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    loadCurrentUserAbort = () => {
      try {
        abortCtrl?.abort(new DOMException("Superseded", "AbortError"));
      } catch {
        /* Ignore unsupported abort reasons. */
      }
    };
    const promise = (async (): Promise<ActionResult> => {
      set({ isLoading: true });
      try {
        const signal = abortCtrl?.signal;
        const response = await authorizedFetch("/api/auth/me/bootstrap", { signal });
        if (response.status === 401) {
          clearToken();
          set(clearSessionState());
          return { ok: false, error: "Session expired. Please log in again." };
        }
        if (!response.ok) {
          const error = await readJsonObject(response);
          throw new Error(stringValue(error.error) || "Failed to load user.");
        }
        const accountData = await readJsonObject(response);
        const user = accountData.user as User;
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          transactions: ((accountData.transactions as TransactionRow[] | undefined) || []).map(
            toTransaction,
          ),
          activeLoans: ((accountData.loans as LoanApiRow[] | undefined) || []).map((loan) =>
            toLoan(loan, user.id),
          ),
          marketplace: ((accountData.items as MarketplaceRow[] | undefined) || []).map(
            toMarketplaceItem,
          ),
          notifications: (
            (accountData.notifications as NotificationRow[] | undefined) || []
          ).map(toNotification),
        });
        return { ok: true };
      } catch (error) {
        if (isAbortError(error)) return { ok: false, error: "Request cancelled." };
        set(clearSessionState());
        return { ok: false, error: toErrorMessage(error) };
      }
    })();
    loadCurrentUserInflight = promise;
    promise
      .catch(() => {})
      .finally(() => {
        loadCurrentUserInflight = null;
      });
    return promise;
  },
  signInWithPassword: async (identifier, password) => {
    try {
      const normalizedIdentifier = identifier.trim().toLowerCase();
      let loginEmail = normalizedIdentifier;
      if (!normalizedIdentifier.includes("@")) {
        const response = await fetch("/api/auth/resolve-username", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: normalizedIdentifier }),
        });
        const data = await readJsonObject(response);
        if (!response.ok || typeof data.email !== "string")
          throw new Error(
            typeof data.error === "string" ? data.error : "Username was not found.",
          );
        loginEmail = data.email.trim().toLowerCase();
      }
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: loginEmail, password }),
      });
      const data = await readJsonObject(response);
      if (!response.ok)
        throw new Error(
          typeof data.error === "string" ? data.error : "Invalid email or password.",
        );
      const csrf = response.headers.get("x-csrf-token");
      if (csrf) saveCsrfHeaderValue(csrf);
      return await get().loadCurrentUser();
    } catch (error) {
      return { ok: false, error: toErrorMessage(error) };
    }
  },
  logout: async () => {
    try {
      await authorizedFetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* Local state is still cleared if the server is unavailable. */
    }
    clearToken();
    set(clearSessionState());
  },
});
