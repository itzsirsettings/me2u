"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import { authorizedFetch, isAbortError } from "@/lib/fetch";

type DeletionRequest = {
  id: string;
  status: "requested" | "in_review";
  requestedAt: string;
  estimatedCompletionAt: string;
};

export default function AccountDeletionPage() {
  const [request, setRequest] = useState<DeletionRequest | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [authenticated, setAuthenticated] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await authorizedFetch("/api/account/deletion", {
          signal: controller.signal,
        });
        if (response.status === 401) {
          setAuthenticated(false);
          return;
        }
        const body = (await response.json()) as { request?: DeletionRequest | null };
        if (!response.ok) throw new Error("Unable to load deletion request status.");
        setRequest(body.request ?? null);
      } catch (cause) {
        if (!isAbortError(cause)) setError("Unable to load your request. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const response = await authorizedFetch("/api/account/deletion", {
        method: "POST",
        body: JSON.stringify({ currentPassword, confirmation }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        request?: DeletionRequest;
      };
      if (!response.ok || !body.request) {
        throw new Error(body.error || "Unable to submit your request.");
      }
      setRequest(body.request);
      setCurrentPassword("");
      setConfirmation("");
      setNotice(body.message || "Your request has been received.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to submit your request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-5 py-10 text-slate-900">
      <Link className="text-sm font-semibold text-emerald-700 underline" href="/profile">
        Back to profile
      </Link>
      <h1 className="mt-6 text-3xl font-bold">Request account deletion</h1>
      <p className="mt-3 text-sm leading-6 text-slate-700">
        You can request deletion of your Me2U account and personal data. We review open loans,
        wallet balances, disputes, and records that must be retained by law before completing
        it. You can continue to sign in to make repayments and contact support while the request
        is reviewed.
      </p>

      {loading ? (
        <p className="mt-8" role="status">
          Loading request status…
        </p>
      ) : null}
      {!loading && !authenticated ? (
        <p className="mt-8 rounded-xl bg-slate-100 p-4 text-sm">
          Sign in to verify your identity and submit a deletion request.{" "}
          <Link
            className="font-semibold text-emerald-700 underline"
            href="/login?next=%2Faccount-deletion"
          >
            Sign in
          </Link>
        </p>
      ) : null}
      {request ? (
        <section
          className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
          aria-live="polite"
        >
          <h2 className="font-bold">
            Request {request.status === "in_review" ? "under review" : "received"}
          </h2>
          <p className="mt-2 text-sm">
            Estimated completion: {new Date(request.estimatedCompletionAt).toLocaleDateString()}
          </p>
          <p className="mt-2 text-sm text-slate-700">
            Return to this page to check your request status or contact support for an update.
            Required financial and audit records may be retained as described in our privacy
            policy.
          </p>
        </section>
      ) : null}
      {!loading && authenticated && !request ? (
        <form
          className="mt-8 space-y-4"
          onSubmit={(event) => {
            void submitRequest(event);
          }}
        >
          <label className="block text-sm font-semibold" htmlFor="current-password">
            Current password
            <input
              autoComplete="current-password"
              className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
              id="current-password"
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              type="password"
              value={currentPassword}
            />
          </label>
          <label className="block text-sm font-semibold" htmlFor="deletion-confirmation">
            Type DELETE to confirm
            <input
              className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
              id="deletion-confirmation"
              onChange={(event) => setConfirmation(event.target.value)}
              required
              value={confirmation}
            />
          </label>
          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="text-sm text-emerald-800" role="status">
              {notice}
            </p>
          ) : null}
          <button
            className="w-full rounded-xl bg-red-700 px-5 py-3 font-semibold text-white disabled:opacity-60"
            disabled={submitting}
            type="submit"
          >
            {submitting ? "Submitting request…" : "Request account deletion"}
          </button>
        </form>
      ) : null}
      {error && !request ? (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <p className="mt-8 text-xs leading-5 text-slate-600">
        Financial records that must be retained are kept only for the applicable legal,
        accounting, fraud-prevention, or dispute-resolution purpose. Read our{" "}
        <Link className="underline" href="/legal/data-policy">
          Data Policy
        </Link>{" "}
        or contact support if you need help.
      </p>
    </main>
  );
}
