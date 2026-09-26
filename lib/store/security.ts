import { postAuthenticatedJson } from "./api";
import { clearSessionState } from "./helpers";
import type { AppStore, StoreSlice } from "./types";

import { clearToken } from "@/lib/railway/token";

type SecuritySlice = Pick<
  AppStore,
  "setTransactionPin" | "revokeOtherSessions" | "logoutAllSessions" | "toggleGroupLending"
>;

export const createSecuritySlice: StoreSlice<SecuritySlice> = (set, get) => ({
  setTransactionPin: async (pin, password) => {
    const result = await postAuthenticatedJson("/api/security/pin", {
      pin,
      password,
    });
    if (result.ok) await get().loadCurrentUser();
    return result;
  },
  revokeOtherSessions: async () => {
    const result = await postAuthenticatedJson("/api/security/sessions/revoke-others", {});
    if (result.ok) await get().loadCurrentUser();
    return result;
  },
  logoutAllSessions: async () => {
    const result = await postAuthenticatedJson("/api/security/sessions/revoke-all", {});
    if (result.ok) {
      clearToken();
      set(clearSessionState());
    }
    return result;
  },
  toggleGroupLending: async () => {
    const result = await postAuthenticatedJson("/api/security/group-lending", {});
    if (result.ok) await get().loadCurrentUser();
    return result;
  },
});
