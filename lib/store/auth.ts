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
import { saveToken, clearToken, saveCsrfHeaderValue } from "@/lib/railway/token";


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
        const [meRes, txRes, loansRes, mktRes, notifRes] = await Promise.all([
          authorizedFetch("/api/auth/me", { signal }),
          authorizedFetch("/api/auth/me/transactions", { signal }),
          authorizedFetch("/api/auth/me/loans", { signal }),
          authorizedFetch("/api/auth/me/marketplace", { signal }),
          authorizedFetch("/api/auth/me/notifications", { signal }),
        ]);
        if (meRes.status === 401) {
          clearToken();
          set(clearSessionState());
          return { ok: false, error: "Session expired. Please log in again." };
        }
        if (!meRes.ok) {
          const error = await readJsonObject(meRes);
          throw new Error(stringValue(error.error) || "Failed to load user.");
        }
        const meData = await readJsonObject(meRes);
        const user = meData.user as User;
        const txData = txRes.ok ? await readJsonObject(txRes) : {};
        const loansData = loansRes.ok ? await readJsonObject(loansRes) : {};
        const mktData = mktRes.ok ? await readJsonObject(mktRes) : {};
        const notifData = notifRes.ok ? await readJsonObject(notifRes) : {};
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          transactions: ((txData.transactions as TransactionRow[] | undefined) || []).map(
            toTransaction,
          ),
          activeLoans: ((loansData.loans as LoanApiRow[] | undefined) || []).map((loan) =>
            toLoan(loan, user.id),
          ),
          marketplace: ((mktData.items as MarketplaceRow[] | undefined) || []).map(
            toMarketplaceItem,
          ),
          notifications: ((notifData.notifications as NotificationRow[] | undefined) || []).map(
            toNotification,
          ),
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
      if (typeof data.token !== "string" || !data.token)
        throw new Error("No token returned from server.");
      saveToken(data.token);
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
