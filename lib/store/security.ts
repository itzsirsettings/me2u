import { postAuthenticatedJson } from "./api";
import type { AppStore, StoreSlice } from "./types";

type SecuritySlice = Pick<AppStore, "setTransactionPin" | "toggleGroupLending">;

export const createSecuritySlice: StoreSlice<SecuritySlice> = (set, get) => ({
  setTransactionPin: async (pin, password, logoutAllSessions = false) => {
    const result = await postAuthenticatedJson("/api/security/pin", {
      pin,
      password,
      logoutAllSessions,
    });
    if (result.ok) await get().loadCurrentUser();
    return result;
  },
  toggleGroupLending: async () => {
    const result = await postAuthenticatedJson("/api/security/group-lending", {});
    if (result.ok) await get().loadCurrentUser();
    return result;
  },
});
