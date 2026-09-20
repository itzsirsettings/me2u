"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ReferralRedirectPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const router = useRouter();

  useEffect(() => {
    params.then(({ code }) => {
      // Store referral code in localStorage for registration flow to pick up,
      // and pass it as a URL param so it survives cross-device/browser redirects
      // (opening the link from WhatsApp/telegram/another browser).
      localStorage.setItem("referral_code", code);
      router.push(`/register?ref=${encodeURIComponent(code)}`);
    });
  }, [params, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Redirecting to registration...</p>
      </div>
    </div>
  );
}
