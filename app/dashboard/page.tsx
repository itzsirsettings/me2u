"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import Icons8Icon, { type Icons8IconName } from "@/components/Icons8Icon";
import { registrationDepositAmount, firstPlatformLoanAmount } from "@/lib/loans";
import { useStore } from "@/lib/store";
import { motion, type Variants } from "framer-motion";

const quickActions: Array<{
  label: string;
  path: string;
  icon: Icons8IconName;
  tone: "primary" | "ghost" | "danger";
}> = [
  { label: "Fund Wallet", path: "/wallet", icon: "cash", tone: "primary" },
  { label: "Marketplace", path: "/marketplace", icon: "market", tone: "ghost" },
  { label: "Withdraw", path: "/withdraw", icon: "requestMoney", tone: "danger" },
  { label: "My Loans", path: "/loans", icon: "loans", tone: "ghost" },
];

export default function Dashboard() {
  const user = useStore((state) => state.user);
  const activeLoans = useStore((state) => state.activeLoans);
  const transactions = useStore((state) => state.transactions);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isLoading = useStore((state) => state.isLoading);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [mounted, isLoading, isAuthenticated, router]);

  if (!mounted || (!isAuthenticated && !isLoading)) return null;

  const firstName = user?.name.trim().split(/\s+/)[0] || "Guest";

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <motion.div 
      className="container mx-auto max-w-7xl px-4 pb-32 pt-20 md:px-6 md:py-24"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants} className="mb-8 md:mb-12">
        <h1 className="mb-2 text-[2.75rem] font-display leading-[0.85] tracking-tight md:text-7xl md:tracking-tighter">
          Welcome {firstName}
        </h1>
        <p className="text-base leading-relaxed font-sans italic opacity-90 text-[var(--color-text-secondary)] md:text-xl">{user?.kycVerified ? "KYC Approved" : "KYC Pending"}</p>
      </motion.div>

      {!user?.registrationDepositPaid && (
        <motion.div variants={itemVariants} className="mb-8 md:mb-10">
          <Card className="kinetic-border bg-[var(--color-warning-bg)] p-5 text-[var(--color-warning-text)] shadow-[4px_4px_0px_var(--color-shadow)] md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider">Registration Deposit Required</p>
                <p className="mt-2 text-sm leading-relaxed">
                  Pay ₦{registrationDepositAmount.toLocaleString()} and submit your reference to unlock your first ₦{firstPlatformLoanAmount.toLocaleString()} withdrawal.
                </p>
              </div>
              <button className="btn-primary h-12 w-full md:w-auto" onClick={() => router.push("/wallet")}>
                Complete Deposit
              </button>
            </div>
          </Card>
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="mb-10 grid gap-4 md:mb-16 md:grid-cols-4 md:gap-6">
        <motion.div whileHover={{ y: -8, transition: { duration: 0.3, ease: 'easeOut' } }}>
          <Card className="kinetic-border p-5 shadow-[4px_4px_0px_var(--color-shadow)] bg-[var(--color-bg-card)] md:p-6">
            <p className="text-[var(--color-text-secondary)] font-sans">Available Balance</p>
            <p className="mt-3 text-3xl font-display leading-none md:text-4xl">
              ₦{(user?.balance || 0).toLocaleString()}
            </p>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -8, transition: { duration: 0.3, ease: 'easeOut' } }}>
          <Card className="kinetic-border p-5 shadow-[4px_4px_0px_var(--color-shadow)] bg-[var(--color-bg-card)] md:p-6">
            <p className="text-[var(--color-text-secondary)] font-sans">Locked Balance</p>
            <p className="mt-3 text-3xl font-display leading-none md:text-4xl">
              ₦{(user?.locked || 0).toLocaleString()}
            </p>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -8, transition: { duration: 0.3, ease: 'easeOut' } }}>
          <Card className="kinetic-border p-5 shadow-[4px_4px_0px_var(--color-shadow)] bg-[var(--color-accent-primary)] text-[var(--color-on-accent)] md:p-6">
            <p className="opacity-90 font-sans">Active Loans</p>
            <p className="mt-3 text-3xl font-display leading-none md:text-4xl">{activeLoans.filter((l) => l.status === "active").length}</p>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -8, transition: { duration: 0.3, ease: 'easeOut' } }}>
          <Card className="kinetic-border p-5 shadow-[4px_4px_0px_var(--color-shadow)] bg-[var(--color-positive-bg)] text-[var(--color-positive-text)] md:p-6">
            <p className="font-sans">Affiliate Earnings</p>
            <p className="mt-3 text-3xl font-display leading-none md:text-4xl">
              ₦{(user?.affiliateEarnings || 0).toLocaleString()}
            </p>
          </Card>
        </motion.div>
      </motion.div>

      <motion.div variants={itemVariants} className="mb-10 md:mb-16">
        <h3 className="mb-4 text-2xl font-display leading-none md:mb-8 md:text-3xl">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-8">
          {user?.role === "admin" && (
            <button
              className="min-h-16 flex-col gap-2 text-center btn-ghost bg-red-500/10 text-red-600 hover:bg-red-500/20"
              onClick={() => router.push("/admin")}
            >
              <Icons8Icon name="shield" size={24} />
              <span>Admin Dashboard</span>
            </button>
          )}
          {quickActions.map((action) => {
            const isDisabled = !user?.kycVerified && action.path !== "/wallet"; // Wallet is allowed for reg deposit, wait actually wallet needs POP but let's just disable everything but wallet if not KYC
            return (
              <button
                key={action.path}
                disabled={isDisabled}
                className={`min-h-16 flex-col gap-2 text-center ${
                  action.tone === "primary" ? "btn-primary" : "btn-ghost"
                } ${
                  action.tone === "danger" ? "text-[var(--color-negative-text)] hover:bg-[var(--color-negative-bg)]" : ""
                } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => {
                  if (!isDisabled) window.location.href = action.path;
                }}
              >
                <Icons8Icon name={action.icon} size={24} />
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <h3 className="mb-4 text-2xl font-display leading-none md:mb-8 md:text-3xl">Recent Transactions</h3>
        <Card className="kinetic-border overflow-hidden bg-[var(--color-bg-card)] shadow-[4px_4px_0px_var(--color-shadow)]">
          {transactions.length === 0 ? (
            <div className="p-6 text-center text-[var(--color-text-secondary)] font-sans italic md:p-8">No recent transactions.</div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="flex flex-col gap-2 p-5 hover:bg-[var(--color-bg-secondary)] transition-colors sm:flex-row sm:items-center sm:justify-between md:p-6">
                  <div className="min-w-0">
                    <p className="font-sans font-medium text-[var(--color-text-primary)]">{tx.description}</p>
                    <p className="text-sm font-sans text-[var(--color-text-secondary)]">{new Date(tx.date).toLocaleString()}</p>
                  </div>
                  <div className={`shrink-0 font-mono font-semibold ${
                    ["deposit", "loan_disbursed", "repayment_received", "affiliate_reward"].includes(tx.type)
                      ? "text-[var(--color-positive-text)]"
                      : "text-[var(--color-negative-text)]"
                  }`}>
                    {["deposit", "loan_disbursed", "repayment_received", "affiliate_reward"].includes(tx.type) ? "+" : "-"}
                    ₦{tx.amount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}
