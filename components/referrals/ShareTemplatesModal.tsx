"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Me2uIcon from "@/components/Me2uIcon";
import { authorizedFetch } from "@/lib/fetch";

interface ShareTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralLink: string;
  username: string;
}

export default function ShareTemplatesModal({
  isOpen,
  onClose,
  referralLink,
  username,
}: ShareTemplatesModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const templates = [
    {
      id: "casual",
      icon: "chat" as const,
      title: "Casual Friend",
      message: `Hey! 👋 I've been using Me2U to get quick loans with 0% interest. No stress, no long forms. Just sign up with my link and get ₦1,500 welcome bonus instantly: ${referralLink}`,
    },
    {
      id: "family",
      icon: "users" as const,
      title: "Family Member",
      message: `Hi! I wanted to share this with you. Me2U helped me get instant loans when I needed money urgently. They give you ₦1,500 just for signing up with this link: ${referralLink}. It's safe and legit - I've been using it myself!`,
    },
    {
      id: "business",
      icon: "moneyBag" as const,
      title: "Business Contact",
      message: `Hello! I'm using Me2U for quick business funding. Zero interest on first loan + instant ₦1,500 bonus when you sign up. Professional and reliable. Check it out: ${referralLink}`,
    },
    {
      id: "urgent",
      icon: "alert" as const,
      title: "Urgent Money",
      message: `Need cash urgently? Me2U gives instant loans (0% interest first time) + ₦1,500 welcome bonus. Takes 5 minutes to set up. Use my link: ${referralLink}`,
    },
    {
      id: "benefits",
      icon: "trophy" as const,
      title: "List Benefits",
      message: `Join Me2U and get:
✅ ₦1,500 welcome bonus (instant!)
✅ First loan at 0% interest
✅ Borrow up to ₦250K
✅ No collateral needed
✅ Quick approval

Sign up with my link: ${referralLink}`,
    },
    {
      id: "simple",
      icon: "link" as const,
      title: "Simple & Direct",
      message: `Get ₦1,500 free + access to instant loans. Sign up here: ${referralLink}`,
    },
  ];

  async function trackShare(type: "whatsapp" | "sms" | "copy" | "native_share") {
    try {
      await authorizedFetch("/api/referrals/share-tracking", {
        method: "POST",
        body: JSON.stringify({ template_type: type }),
      });
    } catch (error) {
      // Silent fail - tracking is not critical
      console.error("Failed to track share:", error);
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Message copied to clipboard!");
      await trackShare("copy");
      setTimeout(onClose, 1500);
    } catch {
      toast.error("Failed to copy. Please try manually.");
    }
  }

  function shareViaWhatsApp(message: string) {
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/?text=${encoded}`;
    window.open(url, "_blank");
    trackShare("whatsapp");
    toast.success("Opening WhatsApp...");
    setTimeout(onClose, 1500);
  }

  function shareViaSMS(message: string) {
    const encoded = encodeURIComponent(message);
    const url = `sms:?body=${encoded}`;
    window.location.href = url;
    trackShare("sms");
    toast.success("Opening Messages...");
    setTimeout(onClose, 1500);
  }

  async function shareViaNavigator(message: string) {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Me2U",
          text: message,
        });
        await trackShare("native_share");
        setTimeout(onClose, 1500);
      } catch (error) {
        // User cancelled share
      }
    } else {
      copyToClipboard(message);
    }
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-[var(--color-bg-card)] border-2 border-[var(--color-border)] shadow-[8px_8px_0px_var(--color-shadow)]"
        >
          {/* Header */}
          <div className="sticky top-0 bg-[var(--color-bg-card)] border-b border-[var(--color-border)] p-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-display font-bold">Share Templates</h2>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                Pre-written messages to help you refer friends easily
              </p>
            </div>
            <button
              onClick={onClose}
              className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-[var(--color-bg-secondary)] transition-colors"
              aria-label="Close"
            >
              <Me2uIcon name="close" size={24} />
            </button>
          </div>

          {/* Templates Grid */}
          <div className="p-6 space-y-4">
            {templates.map((template) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                  selectedTemplate === template.id
                    ? "border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/5"
                    : "border-[var(--color-border)] hover:border-[var(--color-accent-primary)]/50"
                }`}
                onClick={() => setSelectedTemplate(template.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-accent-primary)]">
                    <Me2uIcon name={template.icon} size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-[var(--color-text-primary)]">
                      {template.title}
                    </h3>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-2 whitespace-pre-wrap">
                      {template.message}
                    </p>
                  </div>
                </div>

                {/* Action Buttons (shown when selected) */}
                {selectedTemplate === template.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-4 pt-4 border-t border-[var(--color-border)] grid grid-cols-2 sm:grid-cols-4 gap-2"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        shareViaWhatsApp(template.message);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white font-bold hover:bg-green-600 transition-colors"
                    >
                      <Me2uIcon name="chat" size={16} />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        shareViaSMS(template.message);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white font-bold hover:bg-blue-600 transition-colors"
                    >
                      <Me2uIcon name="chat" size={16} />
                      <span className="hidden sm:inline">SMS</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(template.message);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] font-bold hover:bg-[var(--color-hover-soft)] transition-colors"
                    >
                      <Me2uIcon name="copy" size={16} />
                      <span className="hidden sm:inline">Copy</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        shareViaNavigator(template.message);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-accent-primary)] text-[var(--color-on-accent)] font-bold hover:bg-[var(--color-accent-primary)]/90 transition-colors"
                    >
                      <Me2uIcon name="share" size={16} />
                      <span className="hidden sm:inline">Share</span>
                    </button>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Footer Tip */}
          <div className="border-t border-[var(--color-border)] p-6 bg-[var(--color-bg-secondary)]/30">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
                <Me2uIcon name="info" size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  💡 Pro Tip
                </p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  Personalize the message before sending! Add their name or mention why you think
                  they'd benefit. Personal touches increase conversion by 3x.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
