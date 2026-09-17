import { Resend } from "resend";

const deliveryError = "We couldn't send your verification email. Please try again shortly.";

/** Success means provider acceptance, not confirmed inbox delivery. */
export async function sendOtpEmail(
  toEmail: string,
  code: string,
): Promise<{ success: boolean; error?: string }> {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
    return { success: false, error: "Invalid email address." };
  }
  if (!/^\d{6}$/.test(code)) {
    return { success: false, error: "Invalid verification code format." };
  }
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) return { success: false, error: deliveryError };

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: [toEmail],
      subject: "Your Me2U verification code",
      text: `Your Me2U verification code is ${code}. It expires in 10 minutes. Never share this code. If you didn't request it, ignore this email.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;color:#172033"><h1>Me2U</h1><h2>Verify your email</h2><p>Enter this code to continue:</p><p style="font-size:32px;font-weight:bold;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes. Never share it with anyone, including support.</p><p>If you didn't request this email, you can safely ignore it.</p></div>`,
    });
    // Never log codes, recipients, credentials, or raw provider errors.
    if (error || !data?.id) return { success: false, error: deliveryError };
    return { success: true };
  } catch {
    return { success: false, error: deliveryError };
  }
}

/** Configuration alone does not establish connectivity or inbox delivery. */
export function verifyEmailConfig(): {
  configured: boolean;
  connected: boolean;
  error?: string;
} {
  const configured = Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim(),
  );
  return {
    configured,
    connected: false,
    error: configured
      ? "Resend is configured. Confirm delivery with a controlled inbox test."
      : "Configure RESEND_API_KEY and EMAIL_FROM with a verified Resend sender.",
  };
}
