"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type PaymentProof = {
  id: string;
  user_id: string;
  amount: number;
  reference: string;
  type: string;
  receipt_image_url: string;
  receiptSignedUrl?: string | null;
  status: string;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
};

const signedReceiptTtlSeconds = 10 * 60;

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export default function AdminDashboard() {
  const user = useStore((state) => state.user);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isLoading = useStore((state) => state.isLoading);
  const router = useRouter();
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchProofs = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("payment_proofs")
        .select(`*, profiles(first_name, last_name, email)`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const signedProofs = await Promise.all(
        ((data || []) as unknown as PaymentProof[]).map(async (proof) => {
          const receiptValue = proof.receipt_image_url;
          if (!receiptValue) return { ...proof, receiptSignedUrl: null };
          if (isHttpUrl(receiptValue)) return { ...proof, receiptSignedUrl: receiptValue };

          const { data: signedData, error: signedError } = await supabase.storage
            .from("receipts")
            .createSignedUrl(receiptValue, signedReceiptTtlSeconds);

          if (signedError) {
            console.warn("Could not sign receipt URL.", signedError.message);
          }

          return { ...proof, receiptSignedUrl: signedData?.signedUrl || null };
        }),
      );

      setProofs(signedProofs);
    } catch (error) {
      toast.error("Failed to load payment proofs: " + toErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted || isLoading) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

    if (user.role !== "admin") {
      router.replace("/dashboard");
      return;
    }

    fetchProofs();
  }, [fetchProofs, isAuthenticated, isLoading, mounted, router, user]);

  const handleApprove = async (id: string) => {
    setApproving(id);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.rpc("admin_approve_payment_proof", {
        p_proof_id: id,
      });

      if (error) throw error;
      toast.success("Payment proof approved successfully.");
      await fetchProofs();
    } catch (error) {
      toast.error("Failed to approve: " + toErrorMessage(error));
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject this payment proof?")) return;
    setRejecting(id);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.rpc("admin_reject_payment_proof", {
        p_proof_id: id,
      });

      if (error) throw error;
      toast.success("Payment proof rejected.");
      await fetchProofs();
    } catch (error) {
      toast.error("Failed to reject: " + toErrorMessage(error));
    } finally {
      setRejecting(null);
    }
  };

  if (!mounted || isLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center pt-16 pb-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-accent-primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="min-h-screen px-4 pb-20 pt-20 max-w-7xl mx-auto">
      <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--color-text-primary)] mb-6">
        Admin Dashboard
      </h1>

      <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[4px_4px_0px_var(--color-shadow)] overflow-x-auto">
        <h2 className="mb-4 font-display text-lg font-semibold text-[var(--color-text-primary)]">
          Pending Payment Proofs
        </h2>

        {proofs.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)] italic py-8 text-center">
            No payment proofs found.
          </p>
        ) : (
          <table className="w-full text-left text-sm text-[var(--color-text-secondary)]">
            <thead className="border-b border-[var(--color-border)] text-xs uppercase bg-[var(--color-bg-secondary)]">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Receipt</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {proofs.map((proof) => (
                <tr key={proof.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[var(--color-text-primary)]">{proof.profiles?.first_name} {proof.profiles?.last_name}</p>
                    <p className="text-xs opacity-70">{proof.profiles?.email}</p>
                  </td>
                  <td className="px-4 py-3 capitalize">{proof.type.replace('_', ' ')}</td>
                  <td className="px-4 py-3 font-medium">₦{proof.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 truncate max-w-[150px]">{proof.reference}</td>
                  <td className="px-4 py-3">
                    {proof.receiptSignedUrl ? (
                      <a href={proof.receiptSignedUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent-primary)] hover:underline">
                        View Image
                      </a>
                    ) : (
                      "No Image"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      proof.status === 'pending' ? 'bg-yellow-500/20 text-yellow-600' : 
                      proof.status === 'approved' ? 'bg-green-500/20 text-green-600' : 
                      'bg-red-500/20 text-red-600'
                    }`}>
                      {proof.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">{new Date(proof.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {proof.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(proof.id)}
                          disabled={approving === proof.id || rejecting === proof.id}
                          className="rounded bg-[var(--color-accent-primary)] px-3 py-1.5 text-xs font-bold text-white hover:bg-[var(--color-accent-primary-hover)] disabled:opacity-50"
                        >
                          {approving === proof.id ? "Approving..." : "Approve"}
                        </button>
                        <button
                          onClick={() => handleReject(proof.id)}
                          disabled={approving === proof.id || rejecting === proof.id}
                          className="rounded border border-red-200 bg-[var(--color-negative-bg)] px-3 py-1.5 text-xs font-bold text-[var(--color-negative-text)] hover:bg-red-100 disabled:opacity-50"
                        >
                          {rejecting === proof.id ? "Rejecting..." : "Reject"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
