"use client";

import { useStore } from "@/lib/store";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function NotificationBell() {
  const notifications = useStore((state) => state.notifications);
  const deleteNotification = useStore((state) => state.deleteNotification);
  const clearAllNotifications = useStore((state) => state.clearAllNotifications);
  const [isOpen, setIsOpen] = useState(false);
  
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="relative min-w-0">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open notifications"
        className="mobile-icon-button relative h-11 w-11 rounded-full p-2 transition-colors hover:bg-[var(--color-bg-secondary)] md:h-auto md:w-auto md:bg-transparent md:shadow-none"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text-primary)]">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-negative-bg)] text-[10px] font-bold text-[var(--color-negative-text)]">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-[var(--color-scrim)]"
              onClick={() => setIsOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 top-full z-50 mt-2 w-[min(19rem,calc(100vw-1.5rem))] overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[4px_4px_0px_var(--color-shadow)] md:w-80 md:rounded-xl"
            >
              <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3">
                <h3 className="font-display font-semibold text-[var(--color-text-primary)]">Notifications</h3>
                {notifications.length > 0 && (
                  <button
                    onClick={async () => {
                      await clearAllNotifications();
                    }}
                    className="text-xs font-bold text-[var(--color-accent-primary)] hover:underline"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-2">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-[var(--color-text-secondary)] italic">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      className={`relative mb-2 rounded-lg p-3 pr-8 text-sm transition-colors ${notif.isRead ? 'opacity-70 hover:bg-[var(--color-bg-secondary)]' : 'border border-[var(--color-border)] bg-[var(--color-positive-bg)]'}`}
                    >
                      <p className="overflow-anywhere mb-1 font-semibold text-[var(--color-text-primary)]">{notif.title}</p>
                      <p className="overflow-anywhere text-[var(--color-text-secondary)]">{notif.message}</p>
                      <p className="mt-2 text-xs text-[var(--color-text-secondary)] opacity-60">
                        {new Date(notif.date).toLocaleString()}
                      </p>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          await deleteNotification(notif.id);
                        }}
                        aria-label="Delete notification"
                        className="absolute right-2 top-2 text-[var(--color-text-secondary)] hover:text-[var(--color-negative-text)] transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
