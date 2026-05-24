type LaunchCheck = {
  key: string;
  ok: boolean;
  severity: "required" | "warning";
  message: string;
};

function hasValue(name: string) {
  return Boolean(process.env[name]?.trim());
}

function readValue(name: string) {
  return process.env[name]?.trim() || "";
}

function checkRequired(name: string, message: string): LaunchCheck {
  return {
    key: name,
    ok: hasValue(name),
    severity: "required",
    message,
  };
}

export function getLaunchReadinessChecks(): LaunchCheck[] {
  const checks = [
    checkRequired("NEXT_PUBLIC_SUPABASE_URL", "Supabase project URL is configured."),
    checkRequired("NEXT_PUBLIC_SUPABASE_ANON_KEY", "Supabase anon key is configured."),
    checkRequired("SUPABASE_SERVICE_ROLE_KEY", "Supabase service role key is configured server-side."),
  ];

  checks.push({
    key: "AUTH_TOKEN_SECRET",
    ok: hasValue("AUTH_TOKEN_SECRET"),
    severity: "warning",
    message: hasValue("AUTH_TOKEN_SECRET")
      ? "Dedicated server token secret is configured."
      : "AUTH_TOKEN_SECRET is not set; OTP tokens will rotate with the service role key.",
  });

  const hasNinProviderUrl = hasValue("NIN_VERIFICATION_API_URL");
  const hasNinProviderKey = hasValue("NIN_VERIFICATION_API_KEY");
  const hasNinSecret = hasValue("NIN_HASH_SECRET");
  const hasPartialNinConfig = hasNinProviderUrl !== hasNinProviderKey;
  const needsNinSecret = hasNinProviderUrl && hasNinProviderKey && !hasNinSecret;

  checks.push({
    key: "NIN_VERIFICATION_OPTIONAL",
    ok: !hasPartialNinConfig && !needsNinSecret,
    severity: "warning",
    message:
      hasPartialNinConfig || needsNinSecret
        ? "NIN verification is optional for MVP, but the future KYC config is incomplete."
        : "NIN verification is deferred for MVP; Supabase Auth is the active identity layer.",
  });

  const demoWalletFundingEnabled = process.env.ALLOW_DEMO_WALLET_FUNDING === "true";
  const hasPlatformAccountDetails =
    hasValue("NEXT_PUBLIC_PLATFORM_ACCOUNT_BANK") &&
    hasValue("NEXT_PUBLIC_PLATFORM_ACCOUNT_NAME") &&
    hasValue("NEXT_PUBLIC_PLATFORM_ACCOUNT_NUMBER");

  checks.push({
    key: "WALLET_FUNDING_FLOW",
    ok: hasPlatformAccountDetails || demoWalletFundingEnabled,
    severity: "required",
    message:
      "Wallet funding can complete through the payment account details.",
  });

  checks.push({
    key: "ALLOW_DEMO_WALLET_FUNDING",
    ok: !demoWalletFundingEnabled,
    severity: "warning",
    message: demoWalletFundingEnabled
      ? "Demo wallet funding is enabled; use only for MVP pilots or non-production money."
      : "Demo wallet funding is disabled.",
  });

  checks.push({
    key: "PLATFORM_REGISTRATION_ACCOUNT",
    ok: hasPlatformAccountDetails,
    severity: "warning",
    message: hasPlatformAccountDetails
      ? "Registration deposit account details are configured."
      : "Registration deposit account details are not configured yet.",
  });

  const emailFrom = readValue("EMAIL_FROM");
  const hasResendApiKey = hasValue("RESEND_API_KEY");
  const usesResendSandboxSender = /@resend\.dev>?$/i.test(emailFrom);

  checks.push({
    key: "EMAIL_DELIVERY",
    ok: hasResendApiKey && hasValue("EMAIL_FROM") && !usesResendSandboxSender,
    severity: "required",
    message:
      hasResendApiKey && hasValue("EMAIL_FROM") && !usesResendSandboxSender
        ? "Production email delivery is configured with a non-sandbox sender."
        : "Configure Resend with a verified sending domain and set EMAIL_FROM to that domain before accepting real users.",
  });

  return checks;
}

export function getLaunchReadiness() {
  const checks = getLaunchReadinessChecks();
  const blockers = checks.filter((check) => !check.ok && check.severity === "required");
  const warnings = checks.filter((check) => !check.ok && check.severity === "warning");

  return {
    ok: blockers.length === 0,
    status: blockers.length > 0 ? "blocked" : warnings.length > 0 ? "mvp_with_warnings" : "ready",
    checkedAt: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    checks,
    blockers: blockers.map((check) => ({
      key: check.key,
      message: check.message,
    })),
    warnings: warnings.map((check) => ({
      key: check.key,
      message: check.message,
    })),
  };
}
