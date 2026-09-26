import { postAuthenticatedJson } from "./api";
import type { AppStore, StoreSlice } from "./types";

type SecuritySlice = Pick<
  AppStore,
  "setTransactionPin" | "revokeOtherSessions" | "revokeAllSessions" | "toggleGroupLending"
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
  // The route already revoked every session server-side, so reuse the existing
  // teardown rather than duplicating clearToken + clearSessionState here.
  revokeAllSessions: async () => {
    const result = await postAuthenticatedJson("/api/security/sessions/revoke-all", {});
    if (result.ok) await get().logout();
    return result;
  },
  toggleGroupLending: async () => {
    const result = await postAuthenticatedJson("/api/security/group-lending", {});
    if (result.ok) await get().loadCurrentUser();
    return result;
  },
});
