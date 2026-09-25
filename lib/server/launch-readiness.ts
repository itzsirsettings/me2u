type LaunchCheck = {
  key: string;
  ok: boolean;
  severity: "required" | "warning";
  message: string;
};

function hasValue(name: string) {
  return Boolean(process.env[name]?.trim());
}

function checkRequired(name: string, message: string): LaunchCheck {
  return {
    key: name,
    ok: hasValue(name),
    severity: "required",
    message,
  };
}

function checkWarning(name: string, message: string): LaunchCheck {
  return {
    key: name,
    ok: hasValue(name),
    severity: "warning",
    message,
  };
}

export function getLaunchReadinessChecks(): LaunchCheck[] {
  return [
    checkRequired("DATABASE_URL", "PostgreSQL database URL is required."),
    checkRequired("AUTH_TOKEN_SECRET", "Auth token secret is required."),
    checkRequired("REDIS_URL", "Redis URL is required for rate limiting."),
    checkRequired("PAYSTACK_SECRET_KEY", "Paystack secret key is required."),
    checkRequired("RESEND_API_KEY", "Resend API key is required for email delivery."),
    checkRequired("EMAIL_FROM", "Email sender address is required."),
    checkWarning("NEXT_PUBLIC_APP_URL", "Public app URL should be configured."),
    checkWarning(
      "CRON_SECRET",
      "Cron secret should be configured; auth secret is used as fallback.",
    ),
  ];
}

export function getLaunchReadiness() {
  const checks = getLaunchReadinessChecks();
  const blockers = checks.filter((check) => !check.ok && check.severity === "required");
  const warnings = checks.filter((check) => !check.ok && check.severity === "warning");

  return {
    ok: blockers.length === 0,
    status:
      blockers.length > 0 ? "blocked" : warnings.length > 0 ? "mvp_with_warnings" : "ready",
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
