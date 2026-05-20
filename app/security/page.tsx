"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Icons8Icon from "@/components/Icons8Icon";
import PwaInstallButton from "@/components/PwaInstallButton";
import { visibleSecurityFeatures } from "@/lib/product-features";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { PinInput } from "@/components/ui/PinInput";

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

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem("me2u_session_password");
      if (cached) {
        setPasswordInput(cached);
      }
    }
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [mounted, isLoading, isAuthenticated, router]);

  if (!mounted || (!isAuthenticated && !isLoading)) return null;

  return (
    <main className="app-mobile-screen mx-auto w-full max-w-md px-3.5 pt-[4.85rem] md:max-w-6xl md:px-6 md:py-24">
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
                <h2 className="text-lg font-black leading-tight tracking-normal">Wallet protection</h2>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {walletFrozen
                    ? "Outgoing wallet actions are paused locally until you unfreeze."
                    : "Freeze quickly if you suspect login, PIN, or wallet activity problems."}
                </p>
              </div>
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${
                walletFrozen ? "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]" : "bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]"
              }`}>
                <Icons8Icon name={walletFrozen ? "freeze" : "security"} size={25} />
              </span>
            </div>
            <button
              type="button"
              className={walletFrozen ? "btn-ghost min-h-11 w-full" : "btn-primary min-h-11 w-full"}
              onClick={() => {
                setWalletFrozen((current) => !current);
                toast.info(walletFrozen ? "Wallet freeze removed for this session." : "Wallet freeze marked for this session.");
              }}
            >
              {walletFrozen ? "Unfreeze Wallet" : "Freeze Wallet"}
            </button>
          </article>

          <article className="mobile-soft-card min-w-0 p-4">
            <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-black leading-tight tracking-normal">Transaction PIN</h2>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  Protect withdrawals, bill payments, and transfers with a 4-digit security code.
                </p>
              </div>
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${
                user?.transactionPin ? "bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]" : "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]"
              }`}>
                <Icons8Icon name={user?.transactionPin ? "lock" : "shield"} size={24} />
              </span>
            </div>

            <div className="mb-3 rounded-[8px] bg-[var(--mobile-surface-muted)] p-3">
              <div className="flex items-center gap-2">
                <span className={`inline-block h-2 w-2 rounded-full ${user?.transactionPin ? "bg-[var(--color-positive-text)]" : "bg-[var(--color-warning-text)]"}`} />
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
                  // Clear password input unless cached in sessionStorage
                  if (typeof window !== "undefined" && !sessionStorage.getItem("me2u_session_password")) {
                    setPasswordInput("");
                  }
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
                <h2 className="text-lg font-black leading-tight tracking-normal">Current session</h2>
                <p className="mt-1 text-xs font-medium text-[var(--color-text-secondary)]">
                  {user?.email || "Signed-in account"}
                </p>
              </div>
              <Icons8Icon name="mobile" size={24} className="shrink-0 text-[var(--color-accent-primary)]" />
            </div>
            <div className="rounded-[8px] bg-[var(--mobile-surface-muted)] p-3">
              <p className="text-sm font-black">This device</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                Session history will show verified app sessions as they are recorded by the backend.
              </p>
            </div>
          </article>

          <article className="mobile-soft-card min-w-0 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Icons8Icon name="mobile" size={22} className="text-[var(--color-accent-primary)]" />
              <h2 className="text-lg font-black leading-tight tracking-normal">Install protection</h2>
            </div>
            <p className="mb-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              Keep Me2U close for login alerts, repayment reminders, and security prompts as app notifications roll out.
            </p>
            <PwaInstallButton />
          </article>
        </div>

        <div className="grid gap-4">
          <article className="mobile-soft-card min-w-0 p-4">
            <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-black leading-tight tracking-normal">Security checklist</h2>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  Controls users can recognize before money moves.
                </p>
              </div>
              <Icons8Icon name="shield" size={25} className="shrink-0 text-[var(--color-accent-primary)]" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {visibleSecurityFeatures.map((feature) => (
                <button
                  key={feature.title}
                  type="button"
                  className="flex min-w-0 items-start gap-3 rounded-[8px] border border-[var(--color-border)] bg-[var(--mobile-surface-muted)] p-3 text-left transition hover:bg-[var(--mobile-surface)] active:scale-[0.99]"
                  onClick={() => toast.info(`${feature.title} setup will open when security enrollment is enabled.`)}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--mobile-surface)] text-[var(--color-accent-primary)]">
                    <Icons8Icon name={feature.icon} size={18} />
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
              onClick={() => toast.info("Account recovery will verify identity before access is restored.")}
            >
              <span className="min-w-0">
                <span className="block text-sm font-black">Account recovery</span>
                <span className="mt-1 block text-xs text-[var(--color-text-secondary)]">Recover access with verified identity.</span>
              </span>
              <Icons8Icon name="key" size={22} className="shrink-0 text-[var(--color-accent-primary)]" />
            </button>
            <button
              type="button"
              className="mobile-soft-card flex min-w-0 items-center justify-between gap-3 p-4 text-left transition active:scale-[0.99]"
              onClick={() => toast.info("Fraud report will route suspicious activity to support review.")}
            >
              <span className="min-w-0">
                <span className="block text-sm font-black">Fraud report</span>
                <span className="mt-1 block text-xs text-[var(--color-text-secondary)]">Flag suspicious login or wallet activity.</span>
              </span>
              <Icons8Icon name="alert" size={22} className="shrink-0 text-[var(--color-negative-text)]" />
            </button>
          </article>
        </div>
      </section>
    </main>
  );
}
