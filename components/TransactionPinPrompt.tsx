"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icons8Icon from "./Icons8Icon";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

interface TransactionPinPromptProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}

export default function TransactionPinPrompt({
  isOpen,
  onSuccess,
  onCancel,
  title = "Security PIN",
  description = "Enter your 4-digit PIN to authorize this transaction.",
}: TransactionPinPromptProps) {
  const [pin, setPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const user = useStore((state) => state.user);
  const setStorePin = useStore((state) => state.setPin);
  const verifyStorePin = useStore((state) => state.verifyPin);

  const isSetup = !user?.hasTransactionPin;
  const promptTitle = isSetup ? "Create Security PIN" : title;
  const promptDesc = isSetup 
    ? "Create a 4-digit PIN to protect your transactions. You will need this for all future withdrawals and payments." 
    : description;

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + digit);
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (pin.length !== 4) return;
    
    setIsSubmitting(true);
    
    try {
      if (isSetup) {
        const result = await setStorePin(pin);
        if (result.ok) {
          toast.success("PIN created successfully.");
          onSuccess();
        } else {
          toast.error(result.error || "Failed to create PIN.");
          setPin("");
        }
      } else {
        const result = await verifyStorePin(pin);
        if (result.ok) {
          onSuccess();
        } else {
          toast.error(result.error || "Incorrect PIN.");
          setPin("");
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md rounded-t-[32px] sm:rounded-[32px] bg-[var(--mobile-surface)] p-6 shadow-2xl"
          >
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-[var(--mobile-surface-muted)] text-[var(--color-accent-primary)]">
                <Icons8Icon name={isSetup ? "security" : "lock"} size={32} />
              </div>
              <h3 className="text-xl font-display font-black text-[var(--color-text-primary)]">{promptTitle}</h3>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{promptDesc}</p>
            </div>

            <div className="mb-8 flex justify-center gap-4">
              {[0, 1, 2, 3].map((index) => (
                <div 
                  key={index} 
                  className={`flex h-12 w-12 items-center justify-center rounded-[12px] border-2 transition-colors ${
                    index < pin.length 
                      ? "border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)] text-white" 
                      : "border-[var(--color-border)] bg-[var(--mobile-surface-muted)]"
                  }`}
                >
                  {index < pin.length && <span className="block h-3 w-3 rounded-full bg-white" />}
                </div>
              ))}
            </div>

            <div className="mb-6 grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  className="flex h-14 items-center justify-center rounded-[16px] bg-[var(--mobile-surface-muted)] text-xl font-bold transition active:scale-95"
                  onClick={() => handleDigit(digit.toString())}
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                className="flex h-14 items-center justify-center rounded-[16px] bg-[var(--mobile-surface-muted)] text-xl font-bold transition active:scale-95 text-[var(--color-negative-text)]"
                onClick={onCancel}
              >
                <Icons8Icon name="cancel" size={24} />
              </button>
              <button
                type="button"
                className="flex h-14 items-center justify-center rounded-[16px] bg-[var(--mobile-surface-muted)] text-xl font-bold transition active:scale-95"
                onClick={() => handleDigit("0")}
              >
                0
              </button>
              <button
                type="button"
                className="flex h-14 items-center justify-center rounded-[16px] bg-[var(--mobile-surface-muted)] text-xl font-bold transition active:scale-95 text-[var(--color-text-secondary)]"
                onClick={handleDelete}
              >
                <Icons8Icon name="clearSymbol" size={24} />
              </button>
            </div>

            <button
              type="button"
              className="btn-primary min-h-[3.5rem] w-full"
              disabled={pin.length !== 4 || isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? "Processing..." : "Confirm PIN"}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
