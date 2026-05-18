"use client";

import { useState } from "react";
import LoadingButton from "@/LoadingButton";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const signInWithPassword = useStore((s) => s.signInWithPassword);
  const router = useRouter();

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary p-4">
      <div className="w-full max-w-md rounded-[5px] border border-[var(--color-border)] bg-card p-8 shadow-[4px_4px_0px_var(--color-shadow)]">
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
            className="mb-6"
            autoComplete="current-password"
          />
          <LoadingButton
            label="Login"
            loadingText="Logging in..."
            successText="Login successful!"
            onClick={handleLogin}
          />
        </form>
      </div>
    </div>
  );
}
