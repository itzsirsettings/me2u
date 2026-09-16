import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.EMAIL_FROM || "Me2U <onboarding@resend.dev>";

export async function sendOtpEmail(toEmail: string, code: string): Promise<{ success: boolean; error?: string; loggedToConsole?: boolean }> {
  const emailHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #ffffff; color: #1a1a2e;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 28px; font-weight: 800; margin: 0; color: #2563eb;">Me2U</h1>
        <p style="font-size: 13px; color: #64748b; margin: 4px 0 0;">Borrow smart. Lend safely. 0% interest.</p>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <p style="font-size: 16px; margin: 0 0 16px; color: #334155;">Hi customer,</p>
        <p style="font-size: 16px; margin: 0 0 16px; color: #334155;">Your secure Me2U verification code is:</p>
        <div style="text-align: center; padding: 16px; background: #ffffff; border: 2px dashed #2563eb; border-radius: 8px; margin: 16px 0;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #2563eb; font-family: 'Courier New', monospace;">${code}</span>
        </div>
        <p style="font-size: 14px; margin: 16px 0 0; color: #64748b;">This code will expire in <strong style="color: #1a1a2e;">10 minutes</strong>.</p>
      </div>

      <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="font-size: 14px; font-weight: 600; margin: 0 0 12px; color: #92400e;">For your protection:</p>
        <ul style="font-size: 13px; margin: 0; padding-left: 20px; color: #78350f; line-height: 1.8;">
          <li>Do not share this code with anyone</li>
          <li>Me2U will never ask for your OTP, password, or transaction PIN</li>
          <li>Be careful of anyone pretending to be Me2U support</li>
          <li>If this request was not made by you, update your password and contact support immediately</li>
        </ul>
      </div>

      <p style="font-size: 14px; color: #334155; margin: 0 0 24px;">If you did not request this verification code, you can ignore this email. Your Me2U account cannot be accessed without this code.</p>

      <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; text-align: center;">
        <p style="font-size: 14px; color: #334155; margin: 0 0 4px;">Thank you for helping us keep your wallet and account secure.</p>
        <p style="font-size: 14px; color: #334155; margin: 0 0 16px;">Stay protected,<br><strong>The Me2U Team</strong></p>
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">Me2U — Borrow smart. Lend safely. 0% interest.</p>
      </div>
    </div>
  `;

  const emailText = `Hi customer,

Your secure Me2U verification code is:

${code}

This code will expire in 10 minutes.

If you did not request this verification code, you can ignore this email. Your Me2U account cannot be accessed without this code.

For your protection:

• Do not share this code with anyone
• Me2U will never ask for your OTP, password, or transaction PIN
• Be careful of anyone pretending to be Me2U support
• If this request was not made by you, update your password and contact support immediately

Thank you for helping us keep your wallet and account secure.

Stay protected,
The Me2U Team

Me2U
Borrow smart. Lend safely. 0% interest.`;

  if (!resend) {
    console.log("==========================================");
    console.log("ME2U OTP EMAIL SANDBOX (RESEND NOT CONFIGURED)");
    console.log(`To: ${toEmail}`);
    console.log(`Subject: Your secure Me2U verification code`);
    console.log("------------------------------------------");
    console.log(emailText);
    console.log("==========================================");
    console.log("");
    console.log("To send real emails:");
    console.log("1. Sign up at https://resend.com (free tier: 3,000 emails/month)");
    console.log("2. Get your API key from the dashboard");
    console.log("3. Add RESEND_API_KEY=re_xxxxx to your .env.local");
    console.log("4. Optionally set EMAIL_FROM=you@yourdomain.com");
    console.log("==========================================");

    return {
      success: true,
      loggedToConsole: true,
    };
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject: "Your secure Me2U verification code",
      html: emailHtml,
      text: emailText,
    });

    if (error) {
      return {
        success: false,
        error: error.message || "Email delivery failure",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to send OTP email via Resend:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Email delivery failure",
    };
  }
}
