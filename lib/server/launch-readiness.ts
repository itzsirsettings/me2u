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
  return [
    checkRequired("OPENAI_API_KEY", "OpenAI API key is required for the Me2U Guide assistant."),
  ];
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
