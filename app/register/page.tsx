"use client";

import Icons8Icon, { type Icons8IconName } from "@/components/Icons8Icon";
import LoadingButton from "@/LoadingButton";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { type InputHTMLAttributes, useState } from "react";
import { toast } from "sonner";

type FieldProps = {
  id: string;
  label: string;
  icon: Icons8IconName;
  value: string;
  placeholder: string;
  type?: string;
  autoComplete?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  helper?: string;
  action?: React.ReactNode;
  onChange: (value: string) => void;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function RegistrationField({
  id,
  label,
  icon,
  value,
  placeholder,
  type = "text",
  autoComplete,
  inputMode,
  maxLength,
  helper,
  action,
  onChange,
}: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-3 block text-base font-sans font-bold text-[var(--color-text-primary)]">
        {label}
      </label>
      <div className="relative">
        <Icons8Icon
          name={icon}
          size={23}
          className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
        />
        <Input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          maxLength={maxLength}
          onChange={(event) => onChange(event.target.value)}
          className={`h-14 rounded-[8px] border-transparent bg-[var(--color-bg-secondary)] pl-14 pr-5 shadow-none focus:border-[var(--color-border)] ${
            action ? "pr-14" : ""
          }`}
        />
        {action}
      </div>
      {helper && <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">{helper}</p>}
    </div>
  );
}

export default function Register() {
  const signInWithPassword = useStore((state) => state.signInWithPassword);
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    phone: "",
    referral: "",
    password: "",
  });

  const updateField = (field: keyof typeof formData) => (value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const validate = () => {
    if (formData.firstName.trim().length < 2 || formData.lastName.trim().length < 2) {
      toast.error("Enter your first and last name.");
      return false;
    }

    if (!/^[a-zA-Z0-9]{3,30}$/.test(formData.username.trim())) {
      toast.error("Username must be 3 to 30 letters and numbers only.");
      return false;
    }

    if (!isValidEmail(formData.email.trim())) {
      toast.error("Enter a valid email address.");
      return false;
    }

    const phoneDigits = formData.phone.replace(/\D/g, "");
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      toast.error("Enter a valid phone number.");
      return false;
    }

    if (formData.password.length < 8) {
      toast.error("Enter a password with at least 8 characters.");
      return false;
    }

    return true;
  };

  const completeRegistration = async () => {
    if (!validate()) throw new Error("Validation failed");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          username: formData.username.trim().toLowerCase(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          referral: formData.referral.trim(),
          password: formData.password,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Unable to create account.");
        throw new Error("Unable to create account");
      }

      const signInResult = await signInWithPassword(formData.email, formData.password);
      if (!signInResult.ok) {
        toast.error(signInResult.error || "Account created, but login failed.");
        router.push("/login");
        throw new Error("Login failed");
      }

      toast.success(`Welcome ${data.firstName}. Complete your registration deposit next.`);
      router.push("/wallet");
    } catch (err) {
      if ((err as Error).message !== "Validation failed" && (err as Error).message !== "Unable to create account" && (err as Error).message !== "Login failed") {
        toast.error("Unable to complete registration.");
      }
      throw err;
    }
  };

  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)] px-4 py-8 text-[var(--color-text-primary)]">
      <section className="mx-auto w-full max-w-xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-display font-bold leading-none tracking-tight md:text-5xl">
            Create Account
          </h1>
          <p className="mt-4 text-base text-[var(--color-text-secondary)] md:text-lg">
            Join me2u today and start your journey
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            completeRegistration().catch(() => {});
          }}
          className="space-y-6 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[4px_4px_0px_var(--color-shadow)] md:p-8"
        >
          <RegistrationField
            id="register-first-name"
            label="First Name"
            icon="profile"
            value={formData.firstName}
            placeholder="First name"
            autoComplete="given-name"
            onChange={updateField("firstName")}
          />
          <RegistrationField
            id="register-last-name"
            label="Last Name"
            icon="profile"
            value={formData.lastName}
            placeholder="Last name"
            autoComplete="family-name"
            onChange={updateField("lastName")}
          />
          <RegistrationField
            id="register-username"
            label="Username"
            icon="profile"
            value={formData.username}
            placeholder="Username"
            autoComplete="username"
            helper="Only letters and numbers allowed, no spaces or symbols."
            onChange={(value) => updateField("username")(value.replace(/[^a-zA-Z0-9]/g, ""))}
          />
          <RegistrationField
            id="register-email"
            label="Email Address"
            icon="email"
            value={formData.email}
            placeholder="Email address"
            type="email"
            autoComplete="email"
            onChange={updateField("email")}
          />
          <RegistrationField
            id="register-phone"
            label="Phone Number"
            icon="phone"
            value={formData.phone}
            placeholder="Phone number"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            onChange={updateField("phone")}
          />
          <RegistrationField
            id="register-referral"
            label="Referral (Optional)"
            icon="referral"
            value={formData.referral}
            placeholder="Referrer's username"
            autoComplete="off"
            maxLength={40}
            helper="Enter the username of the person who referred you."
            onChange={updateField("referral")}
          />
          <RegistrationField
            id="register-password"
            label="Password"
            icon="lock"
            value={formData.password}
            placeholder="Password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            onChange={updateField("password")}
            action={
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute right-4 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-[8px] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-hover-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)]"
                onClick={() => setShowPassword((current) => !current)}
              >
                <Icons8Icon name={showPassword ? "invisible" : "visible"} size={22} />
              </button>
            }
          />

          <LoadingButton
            label="Complete Registration"
            loadingText="Creating Account..."
            successText="Account Created!"
            icon={<Icons8Icon name="profile" size={23} />}
            onClick={completeRegistration}
          />
        </form>
      </section>
    </main>
  );
}
