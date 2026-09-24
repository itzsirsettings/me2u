import { postAuthenticatedJson } from "./api";
import type { AppStore, StoreSlice } from "./types";

type MarketplaceSlice = Pick<AppStore, "createMarketplaceItem" | "acceptMarketplaceItem">;

export const createMarketplaceSlice: StoreSlice<MarketplaceSlice> = (set, get) => ({
  createMarketplaceItem: async (item) => {
    const user = get().user;
    if (!user) return { ok: false, error: "Please log in first." };
    if (!user.kycVerified) return { ok: false, error: "Complete your KYC before transacting." };
    const result = await postAuthenticatedJson("/api/marketplace/create", item);
    if (result.ok) await get().loadCurrentUser();
    return result;
  },
  acceptMarketplaceItem: async (itemId) => {
    const user = get().user;
    if (!user) return { ok: false, error: "Please log in first." };
    if (!user.kycVerified) return { ok: false, error: "Complete your KYC before transacting." };
    const result = await postAuthenticatedJson("/api/marketplace/accept", { itemId });
    if (result.ok) await get().loadCurrentUser();
    return result;
  },
});
