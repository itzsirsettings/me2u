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
      // Store referral code in localStorage for registration flow to pick up
      localStorage.setItem("referral_code", code);
      // Redirect to registration
      router.push("/register");
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
