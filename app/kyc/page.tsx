"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import LoadingButton from "@/LoadingButton";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function toSafeStorageFileName(fileName: string) {
  const cleaned = fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
  return cleaned || "passport";
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export default function KYCPage() {
  const router = useRouter();
  const user = useStore((state) => state.user);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isLoading = useStore((state) => state.isLoading);
  const loadCurrentUser = useStore((state) => state.loadCurrentUser);

  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && (!isAuthenticated || !user)) {
      router.push("/login");
    }
  }, [mounted, isLoading, isAuthenticated, user, router]);

  if (!mounted || isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-accent-primary)] border-t-transparent" />
      </div>
    );
  }

  if (user.kycVerified) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 mb-4"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        <h2 className="text-2xl font-bold font-bricolage mb-2 text-white">KYC Verified</h2>
        <p className="text-slate-400 max-w-md">
          Your identity has been verified. You can now access all features of the platform.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-8 rounded-full bg-emerald-500 px-6 py-2.5 font-semibold text-white transition-all hover:bg-emerald-600"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPassportFile(e.target.files[0]);
    }
  };

  const submitKyc = async () => {
    setError("");
    if (!bankName || !accountNumber || !passportFile) {
      setError("Please fill in all fields and upload a passport photograph.");
      throw new Error("Validation failed");
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Session expired. Please log in again.");
      }

      const filePath = `${user.id}/${Date.now()}-${toSafeStorageFileName(passportFile.name)}`;
      
      const { error: uploadError } = await supabase.storage
        .from("kyc-documents")
        .upload(filePath, passportFile);

      if (uploadError) {
        throw new Error(uploadError.message || "Failed to upload passport photograph.");
      }

      const response = await fetch("/api/onboarding/kyc", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bankName,
          accountNumber,
          passportPhotoUrl: filePath,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to complete KYC");
      }

      const loadResult = await loadCurrentUser();
      if (!loadResult.ok) {
        throw new Error(loadResult.error || "KYC saved, but the profile could not be refreshed.");
      }

      router.push("/dashboard");
    } catch (err) {
      setError(toErrorMessage(err));
      throw err;
    }
  };

  return (
    <div className="mx-auto max-w-lg pb-32 pt-20 px-4 md:pt-24">
      <div className="mb-8 text-center md:mb-12">
        <h1 className="text-[2.75rem] font-display leading-[0.85] tracking-tight md:text-7xl md:tracking-tighter mb-4">
          Verify Identity
        </h1>
        <p className="text-base leading-relaxed font-sans italic opacity-90 text-[var(--color-text-secondary)] md:text-xl">
          Complete KYC to unlock full access
        </p>
      </div>

      <div className="space-y-8 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 shadow-[4px_4px_0px_var(--color-shadow)] md:p-8 kinetic-border">
        {error && (
          <div className="flex items-center gap-3 rounded-[5px] bg-red-500/10 p-4 text-red-500 border border-red-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <p className="text-sm font-bold font-sans">{error}</p>
          </div>
        )}

        {/* Bank Details */}
        <div className="space-y-4">
          <h3 className="text-xl font-display leading-none text-[var(--color-text-primary)] flex items-center gap-2">
            <span className="text-[var(--color-accent-primary)]">01.</span> Bank Details
          </h3>
          <p className="text-sm font-sans text-[var(--color-text-secondary)]">
            This account will receive your withdrawals and peer-to-peer loan funds.
          </p>
          <div>
            <label htmlFor="bank-name" className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Bank Name
            </label>
            <input
              id="bank-name"
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              title="Bank Name"
              className="w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 text-[var(--color-text-primary)] placeholder-slate-500 focus:border-[var(--color-accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)] transition-all font-sans"
              placeholder="e.g. Access Bank"
            />
          </div>
          <div>
            <label htmlFor="account-number" className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Account Number
            </label>
            <input
              id="account-number"
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              title="Account Number"
              className="w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 text-[var(--color-text-primary)] placeholder-slate-500 focus:border-[var(--color-accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)] transition-all font-mono"
              placeholder="10 digit number"
              maxLength={10}
            />
          </div>
        </div>

        <div className="h-px w-full bg-[var(--color-border)]" />

        {/* Passport Upload */}
        <div className="space-y-4">
          <h3 className="text-xl font-display leading-none text-[var(--color-text-primary)] flex items-center gap-2">
            <span className="text-[var(--color-accent-primary)]">02.</span> Passport Photo
          </h3>
          <p className="text-sm font-sans text-[var(--color-text-secondary)]">
            Upload a clear, recent passport photograph of yourself.
          </p>
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="passport-upload"
              title="Upload Passport"
            />
            <label
              htmlFor="passport-upload"
              className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-[5px] border-2 border-dashed border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-8 transition-colors hover:border-[var(--color-accent-primary)]/50 hover:bg-[var(--color-bg-card)]"
            >
              {passportFile ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-positive-text)]"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  <span className="text-sm font-bold font-sans text-[var(--color-positive-text)]">
                    {passportFile.name}
                  </span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text-secondary)]"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  <span className="text-sm font-bold font-sans text-[var(--color-text-primary)]">
                    Click to upload image
                  </span>
                  <span className="text-xs font-sans text-[var(--color-text-secondary)]">
                    JPG, PNG or WEBP (Max 5MB)
                  </span>
                </>
              )}
            </label>
          </div>
        </div>

        <div className="h-px w-full bg-[var(--color-border)]" />

        {/* Facial Recognition (Coming Soon) */}
        <div className="space-y-4">
          <h3 className="text-xl font-display leading-none text-[var(--color-text-secondary)] flex items-center gap-2">
            <span className="opacity-50">03.</span> Face Scan
          </h3>
          <div className="flex items-center justify-between rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 opacity-50">
            <div className="flex items-center gap-3">
              <div className="rounded-[5px] bg-[var(--color-bg-card)] p-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text-secondary)]"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg>
              </div>
              <div>
                <p className="font-bold font-sans text-[var(--color-text-primary)]">Live Face Scan</p>
                <p className="text-xs font-sans text-[var(--color-text-secondary)]">
                  Enhanced biometric security
                </p>
              </div>
            </div>
            <span className="rounded-[5px] border border-[var(--color-border)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Coming Soon
            </span>
          </div>
        </div>

        <div className="pt-4 w-full">
          <LoadingButton onClick={submitKyc} label="Submit KYC Verification" />
        </div>
      </div>
    </div>
  );
}
