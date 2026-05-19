"use client";

import Icons8Icon, { type Icons8IconName } from "@/components/Icons8Icon";
import LoadingButton from "@/LoadingButton";
import { Input } from "@/components/ui/input";
import { getCountryConfig, globalCountryOptions, languageOptions } from "@/lib/product-features";
import { useStore } from "@/lib/store";
import { useRouter, useSearchParams } from "next/navigation";
import { type InputHTMLAttributes, useState, useEffect, Suspense } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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

export default function Register() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)] p-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-accent-primary)] border-t-transparent" />
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}

function RegisterContent() {
  const signInWithPassword = useStore((state) => state.signInWithPassword);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Google Sign-in flow states
  const [googleStep, setGoogleStep] = useState<"none" | "select_email" | "enter_otp">("none");
  const [googleEmail, setGoogleEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpToken, setOtpToken] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    phone: "",
    countryCode: "NG",
    preferredLanguage: "en",
    referral: searchParams.get("ref") || "",
    password: "",
  });

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      setFormData(prev => ({ ...prev, referral: ref }));
    }
  }, [searchParams]);

  const updateField = (field: keyof typeof formData) => (value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };
  const selectedCountry = getCountryConfig(formData.countryCode);

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
    if (isSubmitting) return;
    if (!validate()) throw new Error("Validation failed");

    setIsSubmitting(true);
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
          countryCode: formData.countryCode,
          preferredLanguage: formData.preferredLanguage,
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const startGoogleSignIn = () => {
    setGoogleStep("select_email");
  };

  const handleGoogleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(googleEmail)) {
      toast.error("Please enter a valid Google email address.");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: googleEmail, action: "register" }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to send verification code.");
        return;
      }
      setOtpToken(data.token);
      setOtpSent(true);
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
    setIsSubmitting(true);

    try {
      const verifyResponse = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: googleEmail,
          code: verificationCode,
          token: otpToken,
          action: "register",
        }),
      });

      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok) {
        toast.error(verifyData.error || "Incorrect verification code.");
        setIsSubmitting(false);
        return;
      }

      // Auto-generate details for Google sign up
      const googleUser = googleEmail.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
      const generatedUsername = `${googleUser}${Math.floor(100 + Math.random() * 900)}`;

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: googleUser.charAt(0).toUpperCase() + googleUser.slice(1),
          lastName: "GoogleUser",
          username: generatedUsername.toLowerCase(),
          email: googleEmail,
          phone: "+2348031234567", // Default mock phone number for Google sign-in
          countryCode: "NG",
          preferredLanguage: "en",
          referral: formData.referral,
          token: otpToken,
          code: verificationCode,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Google Sign-in registration failed.");
        setIsSubmitting(false);
        return;
      }

      const signInResult = await signInWithPassword(googleEmail, data.password);
      if (!signInResult.ok) {
        toast.error(signInResult.error || "Registration complete but login failed.");
        router.push("/login");
        return;
      }

      toast.success(`Registered with Google successfully! Welcome ${data.firstName}.`);
      router.push("/wallet");
    } catch (err) {
      toast.error("An error occurred during Google registration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)] px-4 py-8 text-[var(--color-text-primary)]">
      <section className="mx-auto w-full max-w-xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-display font-bold leading-none tracking-tight md:text-5xl">
            {googleStep === "enter_otp" ? "Verify Code" : "Create Account"}
          </h1>
          <p className="mt-4 text-base text-[var(--color-text-secondary)] md:text-lg">
            {googleStep === "enter_otp" 
              ? `Verification code sent to ${googleEmail}`
              : "Join me2u today and start your journey"}
          </p>
        </div>

        {googleStep === "none" && (
          <div className="space-y-6">
            {/* Google Sign-in Button */}
            <button
              onClick={startGoogleSignIn}
              className="flex w-full items-center justify-center rounded-[8px] border border-[var(--color-border)] bg-white px-5 py-3.5 text-base font-bold text-slate-800 transition-all hover:bg-slate-50 hover:shadow-sm"
            >
              <GoogleLogo />
              Continue with Google
            </button>

            <div className="relative flex items-center justify-center">
              <span className="absolute inset-x-0 h-px bg-[var(--color-border)]" />
              <span className="relative bg-[var(--color-bg-primary)] px-4 text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Or fill details below
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                completeRegistration().catch(() => {
                  setIsSubmitting(false);
                });
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
              <div>
                <label htmlFor="register-country" className="mb-3 block text-base font-sans font-bold text-[var(--color-text-primary)]">
                  Country
                </label>
                <select
                  id="register-country"
                  value={formData.countryCode}
                  onChange={(event) => {
                    const country = getCountryConfig(event.target.value);
                    setFormData((current) => ({
                      ...current,
                      countryCode: country.code,
                    }));
                  }}
                  className="h-14 w-full rounded-[8px] border border-transparent bg-[var(--color-bg-secondary)] px-4 text-base text-[var(--color-text-primary)] shadow-none focus:border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
                  title="Country"
                >
                  {globalCountryOptions.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name} - {country.currency}
                    </option>
                  ))}
                </select>
                <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {selectedCountry.lendingStatus === "active"
                    ? `${selectedCountry.name} wallets and lending are available with local KYC checks.`
                    : `${selectedCountry.name} profiles can be created now. Lending opens only after local terms, KYC rules, and payment setup are ready.`}
                </p>
              </div>
              <div>
                <label htmlFor="register-language" className="mb-3 block text-base font-sans font-bold text-[var(--color-text-primary)]">
                  Preferred Language
                </label>
                <select
                  id="register-language"
                  value={formData.preferredLanguage}
                  onChange={(event) => updateField("preferredLanguage")(event.target.value)}
                  className="h-14 w-full rounded-[8px] border border-transparent bg-[var(--color-bg-secondary)] px-4 text-base text-[var(--color-text-primary)] shadow-none focus:border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
                  title="Preferred Language"
                >
                  {languageOptions.map((language) => (
                    <option key={language.code} value={language.code}>
                      {language.name}
                    </option>
                  ))}
                </select>
                <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  Me2U can localize currency, terms, support text, and KYC guidance as each country is enabled.
                </p>
              </div>
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
          </div>
        )}

        {/* Google Select Email Modal */}
        {googleStep === "select_email" && (
          <form
            onSubmit={handleGoogleEmailSubmit}
            className="space-y-6 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[4px_4px_0px_var(--color-shadow)] md:p-8"
          >
            <div>
              <div className="flex items-center gap-2 mb-4">
                <GoogleLogo />
                <span className="text-lg font-bold text-slate-800">Sign in with Google</span>
              </div>
              <label htmlFor="google-email-input" className="mb-3 block text-base font-sans font-bold text-[var(--color-text-primary)]">
                Enter your Google Account email
              </label>
              <Input
                id="google-email-input"
                type="email"
                placeholder="email@gmail.com"
                value={googleEmail}
                onChange={(e) => setGoogleEmail(e.target.value)}
                className="h-14 rounded-[8px] border-transparent bg-[var(--color-bg-secondary)] px-5 shadow-none focus:border-[var(--color-border)]"
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setGoogleStep("none")}
                className="btn-ghost flex-1 h-12"
              >
                Back
              </button>
              <button
                type="submit"
                className="btn-primary flex-1 h-12"
              >
                Send OTP
              </button>
            </div>
          </form>
        )}

        {/* Google OTP Verification screen */}
        {googleStep === "enter_otp" && (
          <div className="space-y-6">
            <form
              onSubmit={verifyGoogleOtp}
              className="space-y-6 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[4px_4px_0px_var(--color-shadow)] md:p-8"
            >
              <div>
                <label htmlFor="otp-input" className="mb-3 block text-base font-sans font-bold text-[var(--color-text-primary)]">
                  Enter 6-Digit Code
                </label>
                <input
                  id="otp-input"
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
                <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                  Enter the code from the verification email received.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setGoogleStep("select_email"); setVerificationCode(""); }}
                  className="btn-ghost flex-1 h-12 text-sm"
                  disabled={isSubmitting}
                >
                  Change Email
                </button>
                <LoadingButton
                  label="Verify & Sign Up"
                  loadingText="Verifying..."
                  successText="Verified!"
                  disabled={verificationCode.length !== 6}
                  onClick={() => {}} // Form submit handles this
                />
              </div>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}
