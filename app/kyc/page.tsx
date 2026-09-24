"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { authorizedFetch } from "@/lib/fetch";
import { privateImageAccept, privateImageValidationError } from "@/lib/private-images";
import { useStore } from "@/lib/store";
import { privateImageUrl, uploadPrivateImage } from "@/lib/uploads";
import LoadingButton from "@/LoadingButton";

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

function SubmittedPassport({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className="mx-auto mt-5 max-w-48">
      {failed ? (
        <p
          role="status"
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 text-sm text-[var(--color-text-secondary)]"
        >
          Your saved photo could not be loaded. You can replace it while review is pending, or
          contact support.
        </p>
      ) : (
        <img
          src={src}
          alt="Submitted passport photo"
          onError={() => setFailed(true)}
          className="mx-auto h-40 w-32 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] object-contain"
        />
      )}
    </figure>
  );
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
  const [passportPreviewUrl, setPassportPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isEditingSubmission, setIsEditingSubmission] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!passportFile) {
      setPassportPreviewUrl(null);
      return;
    }
    const previewUrl = URL.createObjectURL(passportFile);
    setPassportPreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [passportFile]);

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

  const submittedPassportUrl = privateImageUrl(user.passportPhotoUrl);

  if (user.kycVerified) {
    return (
      <div className="app-mobile-screen mx-auto flex w-full max-w-lg flex-col items-center justify-center px-3.5 pt-[3.85rem] text-center md:py-24">
        <div className="mb-4 grid h-16 w-16 place-items-center rounded-[5px] border border-[var(--color-border)] bg-[var(--color-positive-bg)] text-[var(--color-positive-text)] shadow-[3px_3px_0px_var(--color-shadow)]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="34"
            height="34"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <h2 className="mb-2 font-display text-xl font-bold text-[var(--color-text-primary)] md:text-2xl">
          KYC Verified
        </h2>
        <p className="max-w-md text-[var(--color-text-secondary)]">
          Your identity has been verified. You now have full Me2U access.
        </p>
        {submittedPassportUrl && (
          <SubmittedPassport key={submittedPassportUrl} src={submittedPassportUrl} />
        )}
        <button
          onClick={() => router.push("/dashboard")}
          className="btn-primary mt-5 h-11 px-5 md:mt-8 md:h-12 md:px-6"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  if (!user.registrationDepositPaid) {
    return (
      <div className="app-mobile-screen mx-auto w-full max-w-lg px-3.5 pt-[3.85rem] text-center md:pt-24">
        <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[4px_4px_0px_var(--color-shadow)] md:p-8">
          <h1 className="text-[2.75rem] font-display leading-[0.85] tracking-tight md:text-6xl">
            KYC Locked
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[var(--color-text-secondary)]">
            Confirm your registration deposit first.
          </p>
          <button
            className="btn-primary mt-5 h-11 w-full md:mt-6 md:h-12"
            onClick={() => router.push("/wallet")}
          >
            Complete Registration Deposit
          </button>
        </div>
      </div>
    );
  }

  const hasSubmittedKyc = Boolean(user.passportPhotoUrl && user.bankName && user.accountNumber);

  if (hasSubmittedKyc && !isEditingSubmission) {
    return (
      <div className="app-mobile-screen mx-auto flex w-full max-w-lg flex-col items-center justify-center px-3.5 pt-[3.85rem] text-center md:py-24">
        <div className="mb-4 grid h-16 w-16 place-items-center rounded-[5px] border border-[var(--color-border)] bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] shadow-[3px_3px_0px_var(--color-shadow)]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="34"
            height="34"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 8v4l3 3"></path>
            <circle cx="12" cy="12" r="10"></circle>
          </svg>
        </div>
        <h2 className="mb-2 font-display text-xl font-bold text-[var(--color-text-primary)] md:text-2xl">
          KYC Under Review
        </h2>
        <p className="max-w-md text-[var(--color-text-secondary)]">
          Your bank details and passport photo have been submitted. Me2U will unlock withdrawals
          and lending after review.
        </p>
        {submittedPassportUrl && (
          <SubmittedPassport key={submittedPassportUrl} src={submittedPassportUrl} />
        )}
        <dl className="mt-5 w-full max-w-sm space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 text-sm">
          <div className="flex items-start justify-between gap-4">
            <dt className="text-[var(--color-text-secondary)]">Bank</dt>
            <dd className="text-right font-semibold">{user.bankName}</dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="text-[var(--color-text-secondary)]">Account</dt>
            <dd className="font-mono">••••••{user.accountNumber?.slice(-4)}</dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={() => {
            setBankName(user.bankName || "");
            setAccountNumber(user.accountNumber || "");
            setError("");
            setIsEditingSubmission(true);
          }}
          className="btn-secondary mt-5 min-h-11 px-5"
        >
          Update submission
        </button>
        <button
          onClick={() => router.push("/dashboard")}
          className="btn-primary mt-5 h-11 px-5 md:mt-8 md:h-12 md:px-6"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    const validationError = file ? privateImageValidationError(file) : null;
    if (validationError) {
      setError(validationError);
      e.target.value = "";
      setPassportFile(null);
      return;
    }
    setError("");
    setPassportFile(file);
  };

  const submitKyc = async () => {
    setError("");
    if (isSubmitting) return;
    if (
      bankName.trim().length < 2 ||
      !/^\d{10}$/.test(accountNumber) ||
      (!passportFile && !submittedPassportUrl)
    ) {
      setError("Enter your bank name, 10-digit account number and a passport photograph.");
      throw new Error("Validation failed");
    }

    setIsSubmitting(true);
    try {
      const filePath = passportFile
        ? await uploadPrivateImage("kyc-documents", user.id, passportFile)
        : user.passportPhotoUrl;

      const response = await authorizedFetch("/api/onboarding/kyc", {
        method: "POST",
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
        throw new Error(
          loadResult.error || "KYC saved, but the profile could not be refreshed.",
        );
      }

      setPassportFile(null);
      setIsEditingSubmission(false);
    } catch (err) {
      setError(toErrorMessage(err));
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-mobile-screen mx-auto w-full max-w-lg px-3.5 pt-[3.85rem] md:pt-24">
      <div className="mb-4 text-center md:mb-12">
        <h1 className="sr-only md:not-sr-only md:mb-4 md:text-7xl md:font-display md:leading-[0.85] md:tracking-tighter">
          Verify Identity
        </h1>
        <p className="text-base leading-relaxed font-sans italic opacity-90 text-[var(--color-text-secondary)] md:text-xl">
          {isEditingSubmission
            ? "Update your pending KYC submission"
            : "Complete KYC to unlock full access"}
        </p>
      </div>

      {isEditingSubmission && (
        <div className="mb-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 text-sm text-[var(--color-text-secondary)]">
          Your existing submission stays in place until you save. A replacement photo is
          optional if your current photo is correct.
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              setIsEditingSubmission(false);
              setPassportFile(null);
              setError("");
            }}
            className="mt-2 block min-h-11 font-semibold text-[var(--color-accent-primary)] underline underline-offset-4"
          >
            Cancel changes
          </button>
        </div>
      )}

      <div className="mb-4 flex items-start gap-3 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3.5 text-left md:mb-6">
        <span aria-hidden className="shrink-0 text-sm">
          ℹ️
        </span>
        <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">
          <span className="font-black text-[var(--color-text-primary)]">
            NIN verification — coming soon.
          </span>{" "}
          Automated NIN identity verification is launching soon. For now, KYC unlocks via
          bank-account ownership plus passport review (1–2 business days).
        </p>
      </div>

      <div className="space-y-5 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[4px_4px_0px_var(--color-shadow)] md:space-y-8 md:p-8 kinetic-border">
        {error && (
          <div
            role="alert"
            className="flex min-w-0 items-center gap-3 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-negative-bg)] p-4 text-[var(--color-negative-text)]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p className="text-sm font-bold font-sans">{error}</p>
          </div>
        )}

        {/* Bank Details */}
        <div className="space-y-4">
          <h3 className="flex min-w-0 items-center gap-2 text-xl font-display leading-none text-[var(--color-text-primary)]">
            <span className="text-[var(--color-accent-primary)]">01.</span> Bank Details
          </h3>
          <p className="text-sm font-sans text-[var(--color-text-secondary)]">
            This account will receive your withdrawals and peer-to-peer loan funds.
          </p>
          <div>
            <label
              htmlFor="bank-name"
              className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]"
            >
              Bank Name
            </label>
            <input
              id="bank-name"
              type="text"
              maxLength={80}
              value={bankName}
              disabled={isSubmitting}
              onChange={(e) => setBankName(e.target.value)}
              title="Bank Name"
              className="w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)] transition-all font-sans"
              placeholder="e.g. Access Bank"
            />
          </div>
          <div>
            <label
              htmlFor="account-number"
              className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]"
            >
              Account Number
            </label>
            <input
              id="account-number"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{10}"
              value={accountNumber}
              disabled={isSubmitting}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
              title="Account Number"
              className="w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)] transition-all font-mono"
              placeholder="10 digit number"
              maxLength={10}
            />
          </div>
        </div>

        <div className="h-px w-full bg-[var(--color-border)]" />

        {/* Passport Upload */}
        <div className="space-y-4">
          <h3 className="flex min-w-0 items-center gap-2 text-xl font-display leading-none text-[var(--color-text-primary)]">
            <span className="text-[var(--color-accent-primary)]">02.</span> Passport Photo
          </h3>
          <p className="text-sm font-sans text-[var(--color-text-secondary)]">
            Upload a clear, recent passport photograph of yourself.
          </p>
          <div className="relative">
            {!passportFile && submittedPassportUrl && (
              <SubmittedPassport key={submittedPassportUrl} src={submittedPassportUrl} />
            )}
            <input
              type="file"
              disabled={isSubmitting}
              accept={privateImageAccept}
              onChange={handleFileChange}
              className="peer sr-only"
              id="passport-upload"
              title="Upload Passport"
            />
            <label
              htmlFor="passport-upload"
              className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-[5px] border-2 border-dashed border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-8 transition-colors hover:border-[var(--color-accent-primary)]/50 hover:bg-[var(--color-bg-card)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-[var(--color-accent-primary)]"
            >
              {passportFile ? (
                <>
                  {passportPreviewUrl && (
                    <img
                      src={passportPreviewUrl}
                      alt="Selected passport photo preview"
                      className="h-40 w-32 rounded-xl border-2 border-[var(--color-positive-text)] object-contain"
                    />
                  )}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-[var(--color-positive-text)]"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  <span className="overflow-anywhere text-center text-sm font-bold font-sans text-[var(--color-positive-text)]">
                    {passportFile.name}
                  </span>
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-[var(--color-text-secondary)]"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <span className="text-sm font-bold font-sans text-[var(--color-text-primary)]">
                    {submittedPassportUrl
                      ? "Choose a replacement photo"
                      : "Choose passport photo"}
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
          <h3 className="flex min-w-0 items-center gap-2 text-xl font-display leading-none text-[var(--color-text-secondary)]">
            <span className="opacity-50">03.</span> Face Scan
          </h3>
          <div className="flex min-w-0 items-center justify-between gap-3 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 opacity-50">
            <div className="flex min-w-0 items-center gap-3">
              <div className="shrink-0 rounded-[5px] bg-[var(--color-bg-card)] p-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[var(--color-text-secondary)]"
                >
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
                  <circle cx="12" cy="13" r="3"></circle>
                </svg>
              </div>
              <div className="min-w-0">
                <p className="font-bold font-sans text-[var(--color-text-primary)]">
                  Live Face Scan
                </p>
                <p className="text-xs font-sans text-[var(--color-text-secondary)]">
                  Enhanced biometric security
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-[5px] border border-[var(--color-border)] px-3 py-1 text-[10px] font-bold uppercase tracking-normal text-[var(--color-text-secondary)] sm:tracking-wider">
              Coming Soon
            </span>
          </div>
        </div>

        <div className="pt-4 w-full">
          <LoadingButton
            onClick={submitKyc}
            label={isEditingSubmission ? "Save updated submission" : "Submit KYC Verification"}
          />
        </div>
      </div>
    </div>
  );
}
