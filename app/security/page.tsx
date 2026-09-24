"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import Me2uIcon from "@/components/Me2uIcon";
import PwaInstallButton from "@/components/PwaInstallButton";
import { PinInput } from "@/components/ui/PinInput";
import { authorizedFetch } from "@/lib/fetch";
import { visibleSecurityFeatures } from "@/lib/product-features";
import { useStore } from "@/lib/store";


type SecurityEvent = {
  id: string;
  type: string;
  detail: string | null;
  created_at: string;
};

export default function SecurityPage() {
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isLoading = useStore((state) => state.isLoading);
  const user = useStore((state) => state.user);
  const setTransactionPin = useStore((state) => state.setTransactionPin);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [walletFrozen, setWalletFrozen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [mfaQr, setMfaQr] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [mounted, isLoading, isAuthenticated, router]);

  // authorizedFetch imported from @/lib/fetch

  const loadSecuritySettings = async () => {
    if (!isAuthenticated) return;
    setSecurityLoading(true);
    try {
      const response = await authorizedFetch("/api/security/actions");
      const data = await response.json().catch(() => ({}));
      if (data.ok) {
        setWalletFrozen(Boolean(data.settings?.wallet_frozen));
        setSecurityEvents(data.events || []);
      }
    } finally {
      setSecurityLoading(false);
    }
  };

  useEffect(() => {
    if (mounted && isAuthenticated) {
      loadSecuritySettings().catch(() => {});
    }
  }, [mounted, isAuthenticated]);

  async function recordSecurityAction(action: string, detail?: string) {
    const response = await authorizedFetch("/api/security/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, detail }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      throw new Error(
        typeof data.error === "string" ? data.error : "Unable to complete security action.",
      );
    }
    await loadSecuritySettings();
  }

  async function startMfaEnrollment() {
    setMfaLoading(true);
    try {
      await recordSecurityAction("start_mfa", "User opened authenticator app enrollment.");
      // Two-factor authentication via TOTP is coming soon.
      // For now, record the intent and show a placeholder message.
      setMfaQr("");
      setMfaSecret("coming-soon");
      toast.success(
        "Two-factor authentication is coming soon. Your interest has been recorded.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start two-factor setup.");
    } finally {
      setMfaLoading(false);
    }
  }

  async function verifyMfaEnrollment() {
    // No-op until TOTP is implemented server-side.
    setMfaQr("");
    setMfaSecret("");
    setMfaCode("");
    toast.success("Two-factor authentication is coming soon.");
  }

  function handleFeatureAction(title: string) {
    if (title === "Two-factor authentication") {
      startMfaEnrollment().catch(() => {});
      return;
    }
    if (title === "Withdrawal PIN" || title === "Transaction PIN") {
      document
        .getElementById("transaction-pin-card")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (title === "Freeze wallet") {
      recordSecurityAction(walletFrozen ? "unfreeze_wallet" : "freeze_wallet")
        .then(() => toast.success(walletFrozen ? "Wallet unfrozen." : "Wallet frozen."))
        .catch((error) => toast.error(error.message));
      return;
    }
    if (title === "Fraud report") {
      recordSecurityAction(
        "report_fraud",
        "User flagged suspicious account or wallet activity.",
      )
        .then(() => toast.success("Fraud report recorded for support review."))
        .catch((error) => toast.error(error.message));
      return;
    }
    if (title === "Account recovery") {
      recordSecurityAction("request_recovery", "User requested account recovery guidance.")
        .then(() =>
          toast.success(
            "Recovery request recorded. Support will verify identity before changes.",
          ),
        )
        .catch((error) => toast.error(error.message));
      return;
    }
    if (title === "Trusted devices") {
      recordSecurityAction("review_trusted_device", "User reviewed trusted device controls.")
        .then(() => toast.success("Trusted device review recorded."))
        .catch((error) => toast.error(error.message));
      return;
    }
    if (
      title === "Session history" ||
      title === "Device login alerts" ||
      title === "Suspicious login warning"
    ) {
      recordSecurityAction("review_session", `User reviewed ${title.toLowerCase()}.`)
        .then(() => toast.success("Session review recorded."))
        .catch((error) => toast.error(error.message));
      return;
    }
    toast.info(`${title} uses device support where available.`);
  }

  if (!mounted || (!isAuthenticated && !isLoading)) return null;

  return (
    <main className="app-mobile-screen mx-auto w-full max-w-md px-3.5 pt-[3.85rem] md:max-w-6xl md:px-6 md:py-24">
      <div className="mb-4 md:mb-8">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
          Security Center
        </p>
        <h1 className="mt-1 text-2xl font-display font-black leading-none tracking-normal md:text-5xl">
          Visible controls for your money.
        </h1>
      </div>

      <section className="grid gap-4 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="grid gap-4">
          <article className="mobile-soft-card min-w-0 p-4">
            <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-black leading-tight tracking-normal">
                  Wallet protection
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {walletFrozen
                    ? "Outgoing wallet actions are paused locally until you unfreeze."
                    : "Freeze quickly if you suspect login, PIN, or wallet activity problems."}
                </p>
              </div>
              <span
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${
                  walletFrozen
                    ? "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]"
                    : "bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]"
                }`}
              >
                <Me2uIcon name={walletFrozen ? "freeze" : "security"} size={25} />
              </span>
            </div>
            <button
              type="button"
              className={
                walletFrozen ? "btn-ghost min-h-11 w-full" : "btn-primary min-h-11 w-full"
              }
              onClick={() => {
                recordSecurityAction(walletFrozen ? "unfreeze_wallet" : "freeze_wallet")
                  .then(() =>
                    toast.success(
                      walletFrozen
                        ? "Wallet freeze removed."
                        : "Wallet frozen. Outgoing wallet actions are paused.",
                    ),
                  )
                  .catch((error) => toast.error(error.message));
              }}
            >
              {walletFrozen ? "Unfreeze Wallet" : "Freeze Wallet"}
            </button>
          </article>

          <article
            id="transaction-pin-card"
            className="mobile-soft-card min-w-0 p-4 scroll-mt-24"
          >
            <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-black leading-tight tracking-normal">
                  Transaction PIN
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  Protect withdrawals, bill payments, and transfers with a 4-digit security
                  code.
                </p>
              </div>
              <span
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${
                  user?.transactionPin
                    ? "bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]"
                    : "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]"
                }`}
              >
                <Me2uIcon name={user?.transactionPin ? "lock" : "shield"} size={24} />
              </span>
            </div>

            <div className="mb-3 rounded-[8px] bg-[var(--mobile-surface-muted)] p-3">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${user?.transactionPin ? "bg-[var(--color-positive-text)]" : "bg-[var(--color-warning-text)]"}`}
                />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                  {user?.transactionPin ? "4-Digit PIN is Active" : "No PIN Set"}
                </span>
              </div>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (pinInput.length !== 4 || !/^\d+$/.test(pinInput)) {
                  toast.error("PIN must be exactly 4 digits.");
                  return;
                }
                if (!passwordInput) {
                  toast.error("Please enter your account password to verify identity.");
                  return;
                }
                setPinLoading(true);
                const res = await setTransactionPin(pinInput, passwordInput);
                setPinLoading(false);
                if (res.ok) {
                  toast.success("Transaction PIN updated successfully.");
                  setPinInput("");
                  setPasswordInput("");
                } else {
                  toast.error(res.error || "Failed to update PIN.");
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Account Password
                </label>
                <input
                  type="password"
                  placeholder="Enter account password to verify"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full rounded-[8px] border border-[var(--color-border)] bg-[var(--mobile-surface-muted)] px-3.5 py-2.5 text-sm focus:border-[var(--color-accent-primary)] focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] text-left mb-1">
                  {user?.transactionPin ? "New 4-Digit PIN" : "Create 4-Digit PIN"}
                </label>
                <PinInput
                  value={pinInput}
                  onChange={setPinInput}
                  secure
                  disabled={pinLoading}
                />
              </div>

              <button
                type="submit"
                disabled={pinLoading || pinInput.length !== 4 || !passwordInput}
                className="btn-primary min-h-11 w-full text-sm font-bold disabled:opacity-50"
              >
                {pinLoading ? "Updating..." : user?.transactionPin ? "Change PIN" : "Set PIN"}
              </button>
            </form>
          </article>

          <article className="mobile-soft-card min-w-0 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-black leading-tight tracking-normal">
                  Current session
                </h2>
                <p className="mt-1 text-xs font-medium text-[var(--color-text-secondary)]">
                  {user?.email || "Signed-in account"}
                </p>
              </div>
              <Me2uIcon
                name="mobile"
                size={24}
                className="shrink-0 text-[var(--color-accent-primary)]"
              />
            </div>
            <div className="rounded-[8px] bg-[var(--mobile-surface-muted)] p-3">
              <p className="text-sm font-black">This device</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                Session and security events are recorded below when sensitive controls are used.
              </p>
            </div>
          </article>

          <article className="mobile-soft-card min-w-0 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Me2uIcon
                name="mobile"
                size={22}
                className="text-[var(--color-accent-primary)]"
              />
              <h2 className="text-lg font-black leading-tight tracking-normal">
                Install protection
              </h2>
            </div>
            <p className="mb-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              Keep Me2U close for login alerts, repayment reminders, and security prompts as app
              notifications roll out.
            </p>
            <PwaInstallButton />
          </article>
        </div>

        <div className="grid gap-4">
          <article className="mobile-soft-card min-w-0 p-4">
            <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-black leading-tight tracking-normal">
                  Security checklist
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  Controls users can recognize before money moves.
                </p>
              </div>
              <Me2uIcon
                name="shield"
                size={25}
                className="shrink-0 text-[var(--color-accent-primary)]"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {visibleSecurityFeatures.map((feature) => (
                <button
                  key={feature.title}
                  type="button"
                  className="flex min-w-0 items-start gap-3 rounded-[8px] border border-[var(--color-border)] bg-[var(--mobile-surface-muted)] p-3 text-left transition hover:bg-[var(--mobile-surface)] active:scale-[0.99]"
                  onClick={() => handleFeatureAction(feature.title)}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--mobile-surface)] text-[var(--color-accent-primary)]">
                    <Me2uIcon name={feature.icon} size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">{feature.title}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-[var(--color-text-secondary)]">
                      {feature.detail}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </article>

          <article className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              className="mobile-soft-card flex min-w-0 items-center justify-between gap-3 p-4 text-left transition active:scale-[0.99]"
              onClick={() => handleFeatureAction("Account recovery")}
            >
              <span className="min-w-0">
                <span className="block text-sm font-black">Account recovery</span>
                <span className="mt-1 block text-xs text-[var(--color-text-secondary)]">
                  Recover access with verified identity.
                </span>
              </span>
              <Me2uIcon
                name="key"
                size={22}
                className="shrink-0 text-[var(--color-accent-primary)]"
              />
            </button>
            <button
              type="button"
              className="mobile-soft-card flex min-w-0 items-center justify-between gap-3 p-4 text-left transition active:scale-[0.99]"
              onClick={() => handleFeatureAction("Fraud report")}
            >
              <span className="min-w-0">
                <span className="block text-sm font-black">Fraud report</span>
                <span className="mt-1 block text-xs text-[var(--color-text-secondary)]">
                  Flag suspicious login or wallet activity.
                </span>
              </span>
              <Me2uIcon
                name="alert"
                size={22}
                className="shrink-0 text-[var(--color-negative-text)]"
              />
            </button>
          </article>

          {mfaSecret === "coming-soon" && (
            <article className="mobile-soft-card min-w-0 p-4">
              <div className="flex items-center gap-3">
                <Me2uIcon
                  name="key"
                  size={23}
                  className="shrink-0 text-[var(--color-accent-primary)]"
                />
                <div className="min-w-0">
                  <h2 className="text-lg font-black leading-tight tracking-normal">
                    Two-factor authentication
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                    TOTP two-factor authentication is coming soon. Your interest has been
                    recorded.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-ghost mt-3 h-9 w-full text-xs"
                onClick={() => setMfaSecret("")}
              >
                Dismiss
              </button>
            </article>
          )}

          <article className="mobile-soft-card min-w-0 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-black leading-tight tracking-normal">
                Security history
              </h2>
              <span className="text-xs font-bold text-[var(--color-text-secondary)]">
                {securityLoading ? "Syncing" : `${securityEvents.length} events`}
              </span>
            </div>
            <div className="grid gap-2">
              {securityEvents.length === 0 ? (
                <p className="rounded-[8px] bg-[var(--mobile-surface-muted)] p-3 text-sm text-[var(--color-text-secondary)]">
                  No security events recorded yet.
                </p>
              ) : (
                securityEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-[8px] bg-[var(--mobile-surface-muted)] p-3"
                  >
                    <p className="text-sm font-black capitalize">
                      {event.type.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      {new Date(event.created_at).toLocaleString()}
                    </p>
                    {event.detail && (
                      <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                        {event.detail}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
