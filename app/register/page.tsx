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
  
  // Standard registration email verification states
  const [regStep, setRegStep] = useState<"email" | "verify_email" | "details">("email");
  const [regEmail, setRegEmail] = useState("");
  const [regEmailCode, setRegEmailCode] = useState("");
  const [regEmailToken, setRegEmailToken] = useState("");
  const [registrationToken, setRegistrationToken] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
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
    } else {
      // Check localStorage for referral code from /r/[code] redirect
      const storedRef = localStorage.getItem("referral_code");
      if (storedRef) {
        setFormData(prev => ({ ...prev, referral: storedRef }));
        localStorage.removeItem("referral_code");
      }
    }
  }, [searchParams]);

  const updateField = (field: keyof typeof formData) => (value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };
  const selectedCountry = getCountryConfig(formData.countryCode);

  const validateDetails = () => {
    if (formData.firstName.trim().length < 2 || formData.lastName.trim().length < 2) {
      toast.error("Enter your first and last name.");
      return false;
    }

    if (!/^[a-zA-Z0-9]{3,30}$/.test(formData.username.trim())) {
      toast.error("Username must be 3 to 30 letters and numbers only.");
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

  // Step 1: Send verification code to email
  const sendVerificationCode = async () => {
    if (isSubmitting) return;
    if (!isValidEmail(regEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "send_code", email: regEmail }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to send verification code.");
        return;
      }
      setRegEmailToken(data.token);
      setRegStep("verify_email");
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

  // Step 2: Verify email code and show registration form
  const verifyEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regEmailCode.length !== 6) return;
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "verify_code",
          email: regEmail,
          code: regEmailCode,
          token: regEmailToken,
        }),
      });

      const data = await response.json();

      if (!response.ok || typeof data.registrationToken !== "string") {
        toast.error(data.error || "Invalid verification code.");
        setIsSubmitting(false);
        return;
      }

      setRegistrationToken(data.registrationToken);
      setRegStep("details");
      toast.success("Email verified! Please complete your registration.");
    } catch (err) {
      toast.error("Failed to verify code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3: Complete registration with all details
  const completeRegistration = async () => {
    if (isSubmitting) return;
    if (!validateDetails()) throw new Error("Validation failed");

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "verify_and_register",
          email: regEmail,
          registrationToken,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          username: formData.username.trim().toLowerCase(),
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

      const signInResult = await signInWithPassword(regEmail, formData.password);
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

  const getPageTitle = () => {
    if (regStep === "email") return "Create Account";
    if (regStep === "verify_email") return "Verify Email";
    return "Complete Registration";
  };

  const getPageSubtitle = () => {
    if (regStep === "email") return "Join me2u today and start your journey";
    if (regStep === "verify_email") return `Verification code sent to ${regEmail}`;
    return "Fill in your details to complete registration";
  };

  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)] px-4 py-8 text-[var(--color-text-primary)]">
      <section className="mx-auto w-full max-w-xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-display font-bold leading-none tracking-tight md:text-5xl">
            {getPageTitle()}
          </h1>
          <p className="mt-4 text-base text-[var(--color-text-secondary)] md:text-lg">
            {getPageSubtitle()}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* Standard registration flow */}
          {regStep === "email" && (
            <motion.div
              key="reg-email"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[4px_4px_0px_var(--color-shadow)] md:p-8">
                <label htmlFor="reg-email-input" className="mb-3 block text-base font-sans font-bold text-[var(--color-text-primary)]">
                  Email Address
                </label>
                <Input
                  id="reg-email-input"
                  type="email"
                  placeholder="you@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="h-14 rounded-[8px] border-transparent bg-[var(--color-bg-secondary)] px-5 shadow-none focus:border-[var(--color-border)]"
                  autoComplete="email"
                />
                <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                  We will send a 6-digit verification code to this email.
                </p>
                <div className="mt-6">
                  <LoadingButton
                    label="Send Verification Code"
                    loadingText="Sending..."
                    successText="Code Sent!"
                    disabled={!isValidEmail(regEmail)}
                    onClick={sendVerificationCode}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {regStep === "verify_email" && (
            <motion.div
              key="reg-verify"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <form
                onSubmit={verifyEmailCode}
                className="space-y-6 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[4px_4px_0px_var(--color-shadow)] md:p-8"
              >
                <div>
                  <label htmlFor="reg-otp-input" className="mb-3 block text-base font-sans font-bold text-[var(--color-text-primary)]">
                    Enter 6-Digit Code
                  </label>
                  <input
                    id="reg-otp-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    value={regEmailCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      if (val.length <= 6) setRegEmailCode(val);
                    }}
                    className="w-full rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3.5 py-2.5 font-mono text-center text-2xl tracking-[0.4em] focus:border-[var(--color-accent-primary)] focus:outline-none"
                    required
                  />
                  <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                    Enter the code from the verification email sent to <strong>{regEmail}</strong>.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setRegStep("email");
                      setRegEmailCode("");
                      setRegistrationToken("");
                    }}
                    className="btn-ghost flex-1 h-12 text-sm"
                    disabled={isSubmitting}
                  >
                    Change Email
                  </button>
                  <LoadingButton
                    label="Verify Email"
                    loadingText="Verifying..."
                    successText="Verified!"
                    disabled={regEmailCode.length !== 6}
                    onClick={() => {}}
                  />
                </div>
              </form>
            </motion.div>
          )}

          {regStep === "details" && (
            <motion.div
              key="reg-details"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-4 rounded-[8px] border border-green/30 bg-green/10 p-4 text-center">
                <p className="text-sm font-bold text-green">Email Verified</p>
                <p className="text-xs text-[var(--color-text-secondary)]">{regEmail}</p>
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
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}
