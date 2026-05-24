"use client";

import { useState } from "react";
import LoadingButton from "@/LoadingButton";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Icons8Icon from "@/components/Icons8Icon";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  if (value === "/login" || value === "/register") return null;
  return value;
}

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const signInWithPassword = useStore((s) => s.signInWithPassword);
  const router = useRouter();

  // Forgot password flow states
  const [forgotStep, setForgotStep] = useState<"none" | "send_code" | "verify_code" | "reset">("none");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotToken, setForgotToken] = useState("");
  const [forgotResetToken, setForgotResetToken] = useState("");
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

    const next = getSafeNextPath(new URLSearchParams(window.location.search).get("next"));
    router.push(next || "/dashboard");
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
          mode: "verify_code",
          email: forgotEmail,
          code: forgotCode,
          token: forgotToken,
        }),
      });

      const data = await response.json();

      if (response.ok && typeof data.resetToken === "string") {
        setForgotResetToken(data.resetToken);
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
          resetToken: forgotResetToken,
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
      setForgotResetToken("");
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
    setForgotResetToken("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary p-4">
      <div className="w-full max-w-md rounded-[5px] border border-[var(--color-border)] bg-card p-8 shadow-[4px_4px_0px_var(--color-shadow)]">
        <AnimatePresence mode="wait">
          {/* Standard login form */}
          {forgotStep === "none" && (
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
