"use client";

import { Bell, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import ReferenceDialog from "@/components/reference/ReferenceDialog";
import { useStore } from "@/lib/store";

export default function ReferenceNotifications() {
  const notifications = useStore((state) => state.notifications);
  const deleteNotification = useStore((state) => state.deleteNotification);
  const clearAllNotifications = useStore((state) => state.clearAllNotifications);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const unread = notifications.filter((notification) => !notification.isRead).length;

  async function remove(id?: string) {
    setBusy(true);
    try {
      const result = id ? await deleteNotification(id) : await clearAllNotifications();
      if (!result.ok)
        toast.error(result.error || "Couldn’t update notifications. Please try again.");
    } catch {
      toast.error("Couldn’t update notifications. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="design-icon-button relative"
        aria-label="Open notifications"
        aria-expanded={open}
        aria-controls={open ? "reference-notifications" : undefined}
        onClick={() => setOpen(true)}
      >
        <Bell size={23} aria-hidden="true" />
        {unread > 0 && (
          <span className="design-notification-dot">
            <span className="sr-only">{unread} unread notifications</span>
          </span>
        )}
      </button>
      {open && (
        <ReferenceDialog
          id="reference-notifications"
          title="Notifications"
          onClose={() => setOpen(false)}
        >
          {notifications.length ? (
            <>
              <button
                type="button"
                className="design-notification-clear"
                onClick={() => void remove()}
                disabled={busy}
              >
                Clear All
              </button>
              <ul className="design-notifications">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <div>
                      <h3>{notification.title}</h3>
                      <p>{notification.message}</p>
                      <time dateTime={notification.date}>
                        {new Intl.DateTimeFormat("en-NG", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(notification.date))}
                      </time>
                    </div>
                    <button
                      type="button"
                      aria-label={`Delete notification: ${notification.title}`}
                      disabled={busy}
                      onClick={() => void remove(notification.id)}
                    >
                      <X size={17} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>No notifications yet.</p>
          )}
        </ReferenceDialog>
      )}
    </>
  );
}
