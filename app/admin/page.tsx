"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";

type PaymentProof = {
  id: string;
  user_id: string;
  amount: number;
  reference: string;
  type: string;
  receipt_image_url: string;
  status: string;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
};

export default function AdminDashboard() {
  const user = useStore((state) => state.user);
  const router = useRouter();
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "admin") {
      router.replace("/dashboard");
      return;
    }
    fetchProofs();
  }, [user, router]);

  const fetchProofs = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("payment_proofs")
        .select(`*, profiles(first_name, last_name, email)`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProofs(data as any[]);
    } catch (error: any) {
      toast.error("Failed to load payment proofs: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setApproving(id);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.rpc("admin_approve_payment_proof" as any, {
        p_proof_id: id,
      });

      if (error) throw error;
      toast.success("Payment proof approved successfully.");
      fetchProofs();
    } catch (error: any) {
      toast.error("Failed to approve: " + error.message);
    } finally {
      setApproving(null);
    }
  };

  if (loading) {
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
                    {proof.receipt_image_url ? (
                      <a href={proof.receipt_image_url} target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent-primary)] hover:underline">
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
                      <button
                        onClick={() => handleApprove(proof.id)}
                        disabled={approving === proof.id}
                        className="rounded bg-[var(--color-accent-primary)] px-3 py-1.5 text-xs font-bold text-white hover:bg-[var(--color-accent-primary-hover)] disabled:opacity-50"
                      >
                        {approving === proof.id ? "Approving..." : "Approve"}
                      </button>
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
