"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Me2uIcon from "@/components/Me2uIcon";
import { authorizedFetch } from "@/lib/fetch";

interface AccountUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  verifiedReferralCount: number;
  onUnlockSuccess?: () => void;
}

interface UnlockStatus {
  isUnlocked: boolean;
  unlockedAt: string | null;
  unlockMethod: "time_based" | "referrals" | "subscription" | "payment" | null;
  verifiedReferralCount: number;
  referralsNeeded: number;
  registrationDate: string;
  daysSinceRegistration: number;
  paymentMade: boolean;
  unlockEligibleAt: string | null;
  daysUntilEligible: number;
  canUnlockNow: boolean;
  hasActiveSubscription: boolean;
  unlockFee: number;
  status: 'unlocked' | 'eligible_via_subscription' | 'eligible_via_referrals' | 'eligible_via_time' | 'waiting_period' | 'locked';
}

export default function AccountUnlockModal({
  isOpen,
  onClose,
  verifiedReferralCount,
  onUnlockSuccess,
}: AccountUnlockModalProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<UnlockStatus | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<"referrals" | "payment">("referrals");

  useEffect(() => {
    if (isOpen) {
      fetchUnlockStatus();
    }
  }, [isOpen]);

  async function fetchUnlockStatus() {
    try {
      const res = await authorizedFetch("/api/account/unlock");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (error) {
      console.error("Failed to fetch unlock status:", error);
    }
  }

  async function handlePaymentUnlock() {
    setLoading(true);
    try {
      const res = await authorizedFetch("/api/account/unlock", {
        method: "POST",
        body: JSON.stringify({ action: "initialize" }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to initialize payment");
      }

      const data = await res.json();
      
      // Redirect to Paystack payment page
      window.location.href = data.authorization_url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start payment");
      setLoading(false);
    }
  }

  if (!isOpen || !status) return null;

  const referralsNeeded = status.referralsNeeded;
  const unlockFee = status.unlockFee;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(77,77,77,0.5)] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg rounded-2xl bg-[var(--color-bg-card)] border-2 border-[var(--color-border)] shadow-[8px_8px_0px_var(--color-shadow)]"
        >
          {/* Header */}
          <div className="border-b border-[var(--color-border)] p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 flex items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                  <Me2uIcon name="lock" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold">Account Locked</h2>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Unlock to withdraw funds
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-[var(--color-bg-secondary)] transition-colors"
                aria-label="Close"
              >
                <Me2uIcon name="close" size={24} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Why Locked */}
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-start gap-3">
                <Me2uIcon name="info" size={20} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                    {status.status === 'waiting_period' 
                      ? `${status.daysUntilEligible} days until unlock` 
                      : 'Why is my account locked?'}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    {status.status === 'waiting_period'
                      ? `You've paid the unlock fee. Your account will automatically unlock on ${status.unlockEligibleAt ? new Date(status.unlockEligibleAt).toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'soon'}. Or refer ${status.referralsNeeded} users for instant unlock!`
                      : 'To prevent fraud and ensure quality, new accounts unlock via: (1) Pay ₦2,000 + wait 15 days, OR (2) Refer 10 verified users, OR (3) Subscribe to Me2U Plus.'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Unlock Methods */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Choose Unlock Method</h3>
              <div className="space-y-3">
                {/* Method 1: Referrals */}
                <button
                  onClick={() => setSelectedMethod("referrals")}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    selectedMethod === "referrals"
                      ? "border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/5"
                      : "border-[var(--color-border)] hover:border-[var(--color-accent-primary)]/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 shrink-0 flex items-center justify-center rounded-lg ${
                      selectedMethod === "referrals" 
                        ? "bg-[var(--color-accent-primary)] text-white" 
                        : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
                    }`}>
                      <Me2uIcon name="users" size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold">Refer {referralsNeeded} More Users</h4>
                        <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 font-bold">
                          FREE
                        </span>
                      </div>
                      <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                        Share your referral link and help {referralsNeeded} friends make their first withdrawal.
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-[var(--color-bg-secondary)] overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                            style={{ width: `${(verifiedReferralCount / 10) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold whitespace-nowrap">
                          {verifiedReferralCount}/10
                        </span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Method 2: Payment + 15 Days */}
                <button
                  onClick={() => setSelectedMethod("payment")}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    selectedMethod === "payment"
                      ? "border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/5"
                      : "border-[var(--color-border)] hover:border-[var(--color-accent-primary)]/50"
                  }`}
                  disabled={status.paymentMade && status.daysUntilEligible > 0}
                >
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 shrink-0 flex items-center justify-center rounded-lg ${
                      selectedMethod === "payment" 
                        ? "bg-[var(--color-accent-primary)] text-white" 
                        : status.paymentMade && status.daysUntilEligible > 0
                        ? "bg-blue-500/20 text-blue-500"
                        : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
                    }`}>
                      <Me2uIcon name="moneyBag" size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold">
                          {status.paymentMade && status.daysUntilEligible > 0
                            ? `Payment Made - ${status.daysUntilEligible} Days Left`
                            : `Pay ₦${unlockFee.toLocaleString()} + Wait 15 Days`
                          }
                        </h4>
                        {status.paymentMade && status.daysUntilEligible > 0 ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold">
                            WAITING
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400 font-bold">
                            15 DAYS
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        {status.paymentMade && status.daysUntilEligible > 0
                          ? `Auto-unlocks on ${status.unlockEligibleAt ? new Date(status.unlockEligibleAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }) : 'soon'}`
                          : 'One-time fee. Account unlocks 15 days after payment.'
                        }
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Selected Method Details */}
            {selectedMethod === "referrals" ? (
              <div className="p-4 rounded-lg bg-[var(--color-bg-secondary)]">
                <h4 className="font-semibold mb-2 text-sm">How to unlock with referrals:</h4>
                <ol className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-[var(--color-accent-primary)]">1.</span>
                    <span>Share your referral link from the Referrals page</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-[var(--color-accent-primary)]">2.</span>
                    <span>Wait for {referralsNeeded} friends to sign up and verify with KYC</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-[var(--color-accent-primary)]">3.</span>
                    <span>Each friend makes their first withdrawal (you earn ₦250 per friend!)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-[var(--color-accent-primary)]">4.</span>
                    <span>Your account unlocks automatically + you earn ₦{referralsNeeded * 250} in rewards</span>
                  </li>
                </ol>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-[var(--color-bg-secondary)]">
                <h4 className="font-semibold mb-2 text-sm">
                  {status.paymentMade && status.daysUntilEligible > 0
                    ? 'Payment received - waiting period active:'
                    : 'Payment + 15-day unlock:'
                  }
                </h4>
                {status.paymentMade && status.daysUntilEligible > 0 ? (
                  <ul className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                    <li className="flex items-center gap-2">
                      <Me2uIcon name="check" size={16} className="text-green-500" />
                      <span>Payment received ✅</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Me2uIcon name="clock" size={16} className="text-blue-500" />
                      <span>Unlocks automatically in {status.daysUntilEligible} day{status.daysUntilEligible !== 1 ? 's' : ''}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Me2uIcon name="calendar" size={16} className="text-blue-500" />
                      <span>
                        Target date: {status.unlockEligibleAt 
                          ? new Date(status.unlockEligibleAt).toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                          : 'Soon'
                        }
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Me2uIcon name="users" size={16} className="text-orange-500" />
                      <span>Or refer {status.referralsNeeded} users for instant unlock!</span>
                    </li>
                  </ul>
                ) : (
                  <ul className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                    <li className="flex items-center gap-2">
                      <Me2uIcon name="moneyBag" size={16} className="text-green-500" />
                      <span>One-time fee of ₦{unlockFee.toLocaleString()}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Me2uIcon name="clock" size={16} className="text-orange-500" />
                      <span>15-day waiting period (fraud prevention)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Me2uIcon name="check" size={16} className="text-blue-500" />
                      <span>Auto-unlocks after 15 days</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Me2uIcon name="shield" size={16} className="text-blue-500" />
                      <span>Secure payment via Paystack</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Me2uIcon name="ban" size={16} className="text-green-500" />
                      <span>No recurring charges</span>
                    </li>
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-[var(--color-border)] p-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] font-bold hover:bg-[var(--color-hover-soft)] transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            {selectedMethod === "referrals" ? (
              <button
                onClick={() => {
                  onClose();
                  window.location.href = "/referrals";
                }}
                className="flex-1 px-6 py-3 rounded-xl bg-[var(--color-accent-primary)] text-[var(--color-on-accent)] font-bold hover:bg-[var(--color-accent-primary)]/90 transition-colors"
              >
                Go to Referrals
              </button>
            ) : status.paymentMade && status.daysUntilEligible > 0 ? (
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 rounded-xl bg-blue-500 text-white font-bold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <Me2uIcon name="clock" size={16} />
                <span>Waiting Period Active</span>
              </button>
            ) : (
              <button
                onClick={handlePaymentUnlock}
                disabled={loading}
                className="flex-1 px-6 py-3 rounded-xl bg-[var(--color-accent-primary)] text-[var(--color-on-accent)] font-bold hover:bg-[var(--color-accent-primary)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Pay ₦{unlockFee.toLocaleString()}</span>
                    <Me2uIcon name="arrowRight" size={16} />
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
