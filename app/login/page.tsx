"use client";

import { useState } from "react";
import LoadingButton from "@/LoadingButton";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const GoogleLogo = () => (
  <svg className="h-5 w-5 mr-3 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const signInWithPassword = useStore((s) => s.signInWithPassword);
  const router = useRouter();

  // Google flow states
  const [googleStep, setGoogleStep] = useState<"none" | "enter_otp">("none");
  const [googleEmail, setGoogleEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [otpToken, setOtpToken] = useState("");

  const handleLogin = async () => {
    if (isSubmitting) return;
    if (!identifier || !password) {
      toast.error("Please fill in all fields.");
      throw new Error("Empty fields");
    }

    setIsSubmitting(true);
    const result = await signInWithPassword(identifier, password);
    setIsSubmitting(false);

    if (!result.ok) {
      toast.error(result.error || "Login failed");
      throw new Error("Login failed");
    }

    router.push("/dashboard");
  };

  const handleGoogleSignInClick = async () => {
    if (isSubmitting) return;
    const email = identifier.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter your Google account email address first.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action: "login" }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to send verification code.");
        return;
      }
      setOtpToken(data.token);
      setGoogleEmail(email);
      setGoogleStep("enter_otp");
      if (data.loggedToConsole) {
        toast.success("Verification code sent! (Check server console in development)");
      } else {
        toast.success("Verification code sent to your email!");
      }
    } catch (err) {
      toast.error("Failed to send verification code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyGoogleOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode.length !== 6) return;
    setIsSubmitting(true);

    try {
      const verifyResponse = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: googleEmail,
          code: verificationCode,
          token: otpToken,
          action: "login",
        }),
      });

      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok) {
        toast.error(verifyData.error || "Incorrect verification code.");
        setIsSubmitting(false);
        return;
      }

      // Login using the password returned from the server
      const signInResult = await signInWithPassword(googleEmail, verifyData.password);
      if (!signInResult.ok) {
        toast.error(signInResult.error || "Login failed");
        return;
      }

      toast.success("Login successful!");
      router.push("/dashboard");
    } catch (err) {
      toast.error("An error occurred during Google sign-in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary p-4">
      <div className="w-full max-w-md rounded-[5px] border border-[var(--color-border)] bg-card p-8 shadow-[4px_4px_0px_var(--color-shadow)]">
        <h1 className="mb-8 text-center text-3xl font-display font-bold">
          {googleStep === "enter_otp" ? "Verify Google Account" : "Welcome Back"}
        </h1>

        {googleStep === "none" && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const btn = document.querySelector(".lb-root") as HTMLButtonElement | null;
              if (btn) {
                btn.click();
              } else {
                handleLogin().catch(() => {
                  setIsSubmitting(false);
                });
              }
            }}
          >
            <label htmlFor="login-identifier" className="mb-2 block text-sm font-sans font-bold uppercase tracking-wider text-secondary">
              Email or username
            </label>
            <Input
              id="login-identifier"
              type="text"
              placeholder="you@example.com or username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="mb-4"
              autoComplete="username"
            />
            <label htmlFor="login-password" className="mb-2 block text-sm font-sans font-bold uppercase tracking-wider text-secondary">
              Password
            </label>
            <Input
              id="login-password"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mb-6"
              autoComplete="current-password"
            />
            <LoadingButton
              label="Login"
              loadingText="Logging in..."
              successText="Login successful!"
              onClick={handleLogin}
            />

            <div className="relative my-6 flex items-center justify-center">
              <span className="absolute inset-x-0 h-px bg-[var(--color-border)]" />
              <span className="relative bg-card px-4 text-xs font-bold uppercase tracking-wider text-secondary">
                Or
              </span>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignInClick}
              disabled={isSubmitting}
              className="flex w-full items-center justify-center rounded-[5px] border border-[var(--color-border)] bg-white px-5 py-3.5 text-base font-bold text-slate-800 transition-all hover:bg-slate-50 disabled:opacity-50"
            >
              <GoogleLogo />
              Continue with Google
            </button>
          </form>
        )}

        {googleStep === "enter_otp" && (
          <form onSubmit={verifyGoogleOtp} className="space-y-6">
            <div>
              <p className="mb-4 text-center text-sm text-[var(--color-text-secondary)]">
                We sent a 6-digit verification code to <strong>{googleEmail}</strong>.
              </p>
              <label htmlFor="login-otp-input" className="mb-3 block text-base font-sans font-bold text-[var(--color-text-primary)]">
                Enter 6-Digit Code
              </label>
              <input
                id="login-otp-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  if (val.length <= 6) setVerificationCode(val);
                }}
                className="w-full rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3.5 py-2.5 font-mono text-center text-2xl tracking-[0.4em] focus:border-[var(--color-accent-primary)] focus:outline-none"
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setGoogleStep("none");
                  setVerificationCode("");
                }}
                className="btn-ghost flex-1 h-12 text-sm"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <LoadingButton
                label="Verify & Login"
                loadingText="Verifying..."
                successText="Logged in!"
                disabled={verificationCode.length !== 6 || isSubmitting}
                onClick={() => {}}
              />
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
