import { create } from "zustand";

import { createAuthSlice } from "./store/auth";
import { createLoansSlice } from "./store/loans";
import { createMarketplaceSlice } from "./store/marketplace";
import { createNotificationsSlice } from "./store/notifications";
import { createSecuritySlice } from "./store/security";
import type { AppStore } from "./store/types";
import { createWalletSlice } from "./store/wallet";

export * from "./store/types";
export { postAuthenticatedJson } from "./store/api";

export const useStore = create<AppStore>()((...args) => ({
  transactions: [],
  marketplace: [],
  activeLoans: [],
  notifications: [],
  ...createAuthSlice(...args),
  ...createWalletSlice(...args),
  ...createMarketplaceSlice(...args),
  ...createLoansSlice(...args),
  ...createSecuritySlice(...args),
  ...createNotificationsSlice(...args),
}));

export function getAuthToken(): Promise<string | null> {
  return Promise.resolve(null);
}
