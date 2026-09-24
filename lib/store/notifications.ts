import { postAuthenticatedJson } from "./api";
import type { AppStore, StoreSlice } from "./types";

type NotificationsSlice = Pick<AppStore, "deleteNotification" | "clearAllNotifications">;

export const createNotificationsSlice: StoreSlice<NotificationsSlice> = (set, get) => ({
  deleteNotification: async (id) => {
    const result = await postAuthenticatedJson("/api/notifications/clear", { id });
    if (result.ok) await get().loadCurrentUser();
    return result;
  },
  clearAllNotifications: async () => {
    const result = await postAuthenticatedJson("/api/notifications/clear", { clearAll: true });
    if (result.ok) await get().loadCurrentUser();
    return result;
  },
});
