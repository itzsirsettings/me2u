"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import LoadingButton from "@/LoadingButton";
import Icons8Icon from "@/components/Icons8Icon";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useRouter } from "next/navigation";
import { loanDurationMaxDays, loanDurationMinDays } from "@/lib/loans";

type ListingType = "borrow_request" | "lending_offer";

export default function Marketplace() {
  const marketplace = useStore((state) => state.marketplace);
  const acceptMarketplaceItem = useStore((state) => state.acceptMarketplaceItem);
  const createMarketplaceItem = useStore((state) => state.createMarketplaceItem);
  const user = useStore((state) => state.user);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isLoading = useStore((state) => state.isLoading);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    type: "borrow_request" as ListingType,
    amount: 10000,
    rate: 0,
    days: loanDurationMaxDays,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [mounted, isLoading, isAuthenticated, router]);

  if (!mounted || (!isAuthenticated && !isLoading)) return null;

  const handleCreate = async () => {
    if (isCreating) return;
    if (!user) {
      toast.error("Please login to create an offer");
      return;
    }
    if (
      formData.amount < 1000 ||
      formData.days < loanDurationMinDays ||
      formData.days > loanDurationMaxDays
    ) {
      toast.error(`Enter an amount from ₦1,000 and duration from ${loanDurationMinDays} to ${loanDurationMaxDays} days.`);
      return;
    }

    setIsCreating(true);
    try {
      const result = await createMarketplaceItem({ ...formData, rate: 0 });
      if (!result.ok) {
        toast.error(result.error || "Unable to create listing");
        throw new Error("Unable to create");
      }

      toast.success("Listing created successfully!");
      setShowForm(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleAccept = async (itemId: string, amount: number, type: string) => {
    if (!user) {
      toast.error("Please login to accept offers");
      return;
    }
    if (type === "borrow_request" && user.balance < amount) {
      toast.error("Insufficient balance to fund this loan.");
      return;
    }

    const result = await acceptMarketplaceItem(itemId);
    if (!result.ok) {
      toast.error(result.error || "Unable to accept this listing");
      throw new Error("Unable to accept");
    }

    toast.success("Transaction successful!");
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <motion.div 
      className="app-mobile-screen mx-auto w-full max-w-md px-3.5 pt-[4.85rem] md:max-w-5xl md:px-6 md:py-24"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants} className="mb-4 flex min-w-0 flex-col gap-3 md:mb-12 md:flex-row md:items-center md:justify-between md:gap-6">
        <h1 className="sr-only md:not-sr-only md:text-7xl md:font-display md:leading-[0.85] md:tracking-tighter">Marketplace</h1>
        <button className={`${showForm ? "btn-ghost" : "btn-primary"} h-11 w-full md:h-12 md:w-auto`} onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Create Listing"}
        </button>
      </motion.div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="mb-5 glass kinetic-border p-4 bg-[var(--color-bg-secondary)] md:mb-12 md:p-8">
              <h2 className="mb-4 text-xl font-display md:mb-6 md:text-3xl">Create New Listing</h2>
              <form onSubmit={(e) => { e.preventDefault(); handleCreate().catch(()=>{}); }} className="grid gap-3.5 md:grid-cols-2 md:gap-6">
                <div>
                  <label className="mb-2 block text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Type</label>
                  <select
                    className="h-11 w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 font-sans focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none md:h-12"
                    value={formData.type}
                    title="Listing Type"
                    onChange={(e) => {
                      const nextType = e.target.value;
                      if (nextType === "borrow_request" || nextType === "lending_offer") {
                        setFormData({ ...formData, type: nextType });
                      }
                    }}
                  >
                    <option value="borrow_request">I want to Borrow</option>
                    <option value="lending_offer">I want to Lend</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Amount (₦)</label>
                  <input
                    type="number"
                    min="1000"
                    className="h-11 w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 font-mono focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none md:h-12"
                    value={formData.amount}
                    title="Amount"
                    placeholder="Enter amount"
                    onChange={(e) =>
                      setFormData({ ...formData, amount: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="rounded-[5px] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
                  <p className="mb-1 text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Interest</p>
                  <p className="font-mono text-xl text-[var(--color-positive-text)]">0%</p>
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">All me2u loans are interest-free.</p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Duration (Days)</label>
                  <input
                    type="number"
                    min={loanDurationMinDays}
                    max={loanDurationMaxDays}
                    className="h-11 w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 font-mono focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none md:h-12"
                    value={formData.days}
                    title="Duration in Days"
                    placeholder="Days"
                    onChange={(e) =>
                      setFormData({ ...formData, days: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="md:col-span-2 mt-4">
                  <LoadingButton
                    label="Publish Listing"
                    loadingText="Publishing..."
                    successText="Published!"
                    onClick={handleCreate}
                  />
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 md:gap-8">
        {marketplace.map((item) => (
          <motion.div key={item.id} whileHover={{ y: -8, transition: { duration: 0.3 } }}>
            <Card className="kinetic-border p-5 h-full flex flex-col justify-between shadow-[4px_4px_0px_var(--color-shadow)] bg-[var(--color-bg-card)] md:p-8">
              <div>
                <div className="mb-4 flex min-w-0 items-start justify-between gap-3 border-b border-[var(--color-border)] pb-3 md:mb-6 md:pb-4">
                  <div className="min-w-0">
                    <p className={`font-sans font-bold uppercase tracking-wide text-sm ${item.type === "borrow_request" ? "text-[var(--color-warning-text)]" : "text-[var(--color-accent-primary)]"}`}>
                      {item.type === "borrow_request" ? "Borrow Request" : "Lending Offer"}
                    </p>
                    <p className="overflow-anywhere mt-1 font-sans text-sm italic text-[var(--color-text-secondary)]">by {item.authorName}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-positive-bg)] px-2 py-1 text-[11px] font-bold font-mono text-[var(--color-positive-text)] shadow-[2px_2px_0px_var(--color-shadow)] md:px-3 md:text-xs">
                    <Icons8Icon name="shield" size={16} />
                    Trust: {item.trustScore}
                  </div>
                </div>
                <p className="overflow-anywhere mt-2 text-2xl font-display leading-none md:text-5xl">₦{item.amount.toLocaleString()}</p>
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm font-sans text-[var(--color-text-secondary)] md:mt-6 md:gap-4">
                  <div className="p-3 bg-[var(--color-bg-primary)] rounded-[5px] kinetic-border border-dashed">
                    <p className="text-[10px] uppercase font-bold tracking-[0.1em] mb-1 md:tracking-[0.2em]">Interest</p>
                    <p className="text-xl font-mono text-[var(--color-positive-text)]">0%</p>
                  </div>
                  <div className="p-3 bg-[var(--color-bg-primary)] rounded-[5px] kinetic-border border-dashed">
                    <p className="text-[10px] uppercase font-bold tracking-[0.1em] mb-1 md:tracking-[0.2em]">Duration</p>
                    <p className="text-xl font-mono text-[var(--color-text-primary)]">{item.days}d</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 md:mt-8">
                <LoadingButton
                  variant={item.type === "borrow_request" ? "solid" : "outline"}
                  label={item.type === "borrow_request" ? "Fund this Loan" : "Accept Offer"}
                  loadingText="Processing..."
                  successText="Success!"
                  onClick={() => handleAccept(item.id, item.amount, item.type)}
                />
              </div>
            </Card>
          </motion.div>
        ))}
        {marketplace.length === 0 && (
          <div className="py-12 text-center md:col-span-2 md:py-16">
            <p className="text-base leading-relaxed font-sans italic opacity-90 text-[var(--color-text-secondary)] md:text-xl">No items in the marketplace. Create one!</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
