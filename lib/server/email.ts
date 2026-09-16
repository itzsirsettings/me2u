import nodemailer from "nodemailer";

// SMTP Configuration - Works with Gmail, Outlook, Yahoo, or any SMTP server
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: process.env.SMTP_USER && process.env.SMTP_PASSWORD ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  } : undefined,
});

const FROM_EMAIL = process.env.EMAIL_FROM || "Me2U <noreply@me2u.app>";
const SMTP_CONFIGURED = !!(process.env.SMTP_USER && process.env.SMTP_PASSWORD);

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

  if (!SMTP_CONFIGURED) {
    console.log("==========================================");
    console.log("ME2U OTP EMAIL SANDBOX (SMTP NOT CONFIGURED)");
    console.log(`To: ${toEmail}`);
    console.log(`Subject: Your secure Me2U verification code`);
    console.log("------------------------------------------");
    console.log(emailText);
    console.log("==========================================");
    console.log("");
    console.log("To send real emails, add these to your environment:");
    console.log("SMTP_HOST=smtp.gmail.com");
    console.log("SMTP_PORT=587");
    console.log("SMTP_SECURE=false");
    console.log("SMTP_USER=your-email@gmail.com");
    console.log('SMTP_PASSWORD=your-app-password');
    console.log('EMAIL_FROM="Me2U" <your-email@gmail.com>');
    console.log("");
    console.log("For Gmail App Password:");
    console.log("1. Enable 2FA on your Google account");
    console.log("2. Go to: https://myaccount.google.com/apppasswords");
    console.log("3. Generate new app password");
    console.log("4. Use that password in SMTP_PASSWORD");
    console.log("==========================================");

    return {
      success: true,
      loggedToConsole: true,
    };
  }

  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: toEmail,
      subject: "Your secure Me2U verification code",
      html: emailHtml,
      text: emailText,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to send OTP email via SMTP:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Email delivery failure",
    };
  }
}
