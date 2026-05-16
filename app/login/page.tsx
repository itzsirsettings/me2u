"use client";

import { useState } from "react";
import LoadingButton from "@/LoadingButton";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const signInWithPassword = useStore((s) => s.signInWithPassword);
  const router = useRouter();

  const handleLogin = async () => {
    const result = await signInWithPassword(email, password);

    if (!result.ok) {
      toast.error(result.error || "Login failed");
      throw new Error("Login failed");
    }

    toast.success("Login successful");
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary p-4">
      <div className="w-full max-w-md rounded-[5px] border border-[var(--color-border)] bg-card p-8 shadow-[4px_4px_0px_var(--color-shadow)]">
        <h1 className="mb-8 text-center text-3xl font-display font-bold">Welcome Back</h1>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleLogin();
          }}
        >
          <label htmlFor="login-email" className="mb-2 block text-sm font-sans font-bold uppercase tracking-wider text-secondary">
            Email
          </label>
          <Input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4"
            autoComplete="email"
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
            onClick={async () => {
              if (!email || !password) return;
              await handleLogin();
            }}
          />
        </form>
      </div>
    </div>
  );
}
