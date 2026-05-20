"use client";

import { useState } from "react";
import LoadingButton from "@/LoadingButton";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Icons8Icon from "@/components/Icons8Icon";

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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const signInWithPassword = useStore((s) => s.signInWithPassword);
  const router = useRouter();

  // Google flow states
  const [googleStep, setGoogleStep] = useState<"none" | "enter_otp">("none");
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleVerificationCode, setGoogleVerificationCode] = useState("");
  const [googleOtpToken, setGoogleOtpToken] = useState("");

  // Forgot password flow states
  const [forgotStep, setForgotStep] = useState<"none" | "send_code" | "verify_code" | "reset">("none");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotToken, setForgotToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

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
      setGoogleOtpToken(data.token);
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
    if (googleVerificationCode.length !== 6) return;
    setIsSubmitting(true);

    try {
      const verifyResponse = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: googleEmail,
          code: googleVerificationCode,
          token: googleOtpToken,
          action: "login",
        }),
      });

      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok) {
        toast.error(verifyData.error || "Incorrect verification code.");
        setIsSubmitting(false);
        return;
      }

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

  // Forgot password handlers
  const sendForgotCode = async () => {
    if (isSubmitting) return;
    if (!isValidEmail(forgotEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to send verification code.");
        return;
      }
      setForgotToken(data.token);
      setForgotStep("verify_code");
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

  const verifyForgotCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotCode.length !== 6) return;
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail,
          code: forgotCode,
          token: forgotToken,
          newPassword: "verify_only_123",
        }),
      });

      const data = await response.json();

      if (response.ok || data.error === "Password must be at least 8 characters.") {
        setForgotStep("reset");
        toast.success("Email verified! Please enter your new password.");
      } else {
        toast.error(data.error || "Invalid verification code.");
      }
    } catch (err) {
      toast.error("Failed to verify code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetPassword = async () => {
    if (isSubmitting) return;
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail,
          code: forgotCode,
          token: forgotToken,
          newPassword,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to reset password.");
        return;
      }

      toast.success("Password reset successfully! Please login with your new password.");
      setForgotStep("none");
      setIdentifier(forgotEmail);
      setNewPassword("");
      setConfirmPassword("");
      setForgotCode("");
    } catch (err) {
      toast.error("Failed to reset password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startForgotPassword = () => {
    setForgotStep("send_code");
    setForgotEmail(identifier);
  };

  const cancelForgotPassword = () => {
    setForgotStep("none");
    setForgotCode("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary p-4">
      <div className="w-full max-w-md rounded-[5px] border border-[var(--color-border)] bg-card p-8 shadow-[4px_4px_0px_var(--color-shadow)]">
        <AnimatePresence mode="wait">
          {/* Standard login form */}
          {forgotStep === "none" && googleStep === "none" && (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="mb-8 text-center text-3xl font-display font-bold">Welcome Back</h1>

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
                  className="mb-2"
                  autoComplete="current-password"
                />

                <div className="mb-6 text-right">
                  <button
                    type="button"
                    onClick={startForgotPassword}
                    className="text-sm font-bold text-[var(--color-accent-primary)] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>

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
            </motion.div>
          )}

          {/* Google OTP verification */}
          {googleStep === "enter_otp" && (
            <motion.div
              key="google-otp"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="mb-8 text-center text-3xl font-display font-bold">Verify Google Account</h1>

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
                    value={googleVerificationCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      if (val.length <= 6) setGoogleVerificationCode(val);
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
                      setGoogleVerificationCode("");
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
                    disabled={googleVerificationCode.length !== 6 || isSubmitting}
                    onClick={() => {}}
                  />
                </div>
              </form>
            </motion.div>
          )}

          {/* Forgot password: send code */}
          {forgotStep === "send_code" && (
            <motion.div
              key="forgot-send"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="mb-2 text-center text-3xl font-display font-bold">Forgot Password</h1>
              <p className="mb-6 text-center text-sm text-[var(--color-text-secondary)]">
                Enter your email address and we will send you a verification code.
              </p>

              <div className="space-y-6">
                <label htmlFor="forgot-email" className="mb-2 block text-sm font-sans font-bold uppercase tracking-wider text-secondary">
                  Email Address
                </label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="mb-4"
                  autoComplete="email"
                />

                <LoadingButton
                  label="Send Verification Code"
                  loadingText="Sending..."
                  successText="Code Sent!"
                  onClick={sendForgotCode}
                />

                <button
                  type="button"
                  onClick={cancelForgotPassword}
                  className="btn-ghost w-full h-12 text-sm"
                >
                  Back to Login
                </button>
              </div>
            </motion.div>
          )}

          {/* Forgot password: verify code */}
          {forgotStep === "verify_code" && (
            <motion.div
              key="forgot-verify"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="mb-2 text-center text-3xl font-display font-bold">Verify Email</h1>
              <p className="mb-6 text-center text-sm text-[var(--color-text-secondary)]">
                We sent a 6-digit verification code to <strong>{forgotEmail}</strong>.
              </p>

              <form onSubmit={verifyForgotCode} className="space-y-6">
                <div>
                  <label htmlFor="forgot-otp-input" className="mb-3 block text-base font-sans font-bold text-[var(--color-text-primary)]">
                    Enter 6-Digit Code
                  </label>
                  <input
                    id="forgot-otp-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    value={forgotCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      if (val.length <= 6) setForgotCode(val);
                    }}
                    className="w-full rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3.5 py-2.5 font-mono text-center text-2xl tracking-[0.4em] focus:border-[var(--color-accent-primary)] focus:outline-none"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={cancelForgotPassword}
                    className="btn-ghost flex-1 h-12 text-sm"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <LoadingButton
                    label="Verify Code"
                    loadingText="Verifying..."
                    successText="Verified!"
                    disabled={forgotCode.length !== 6 || isSubmitting}
                    onClick={() => {}}
                  />
                </div>
              </form>
            </motion.div>
          )}

          {/* Forgot password: reset password */}
          {forgotStep === "reset" && (
            <motion.div
              key="forgot-reset"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="mb-2 text-center text-3xl font-display font-bold">Reset Password</h1>
              <p className="mb-6 text-center text-sm text-[var(--color-text-secondary)]">
                Enter your new password for <strong>{forgotEmail}</strong>.
              </p>

              <div className="space-y-6">
                <div>
                  <label htmlFor="new-password" className="mb-2 block text-sm font-sans font-bold uppercase tracking-wider text-secondary">
                    New Password
                  </label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="At least 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pr-14"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-[8px] text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-soft)]"
                    >
                      <Icons8Icon name={showNewPassword ? "invisible" : "visible"} size={22} />
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm-password" className="mb-2 block text-sm font-sans font-bold uppercase tracking-wider text-secondary">
                    Confirm Password
                  </label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>

                <LoadingButton
                  label="Reset Password"
                  loadingText="Resetting..."
                  successText="Password Reset!"
                  onClick={resetPassword}
                />

                <button
                  type="button"
                  onClick={cancelForgotPassword}
                  className="btn-ghost w-full h-12 text-sm"
                >
                  Back to Login
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
