import nodemailer from "nodemailer";

export async function sendOtpEmail(toEmail: string, code: string): Promise<{ success: boolean; error?: string; loggedToConsole?: boolean }> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "465");
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM || `"Me2U" <noreply@me2u.com>`;

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

  // Check if SMTP is configured
  if (!host || !user || !pass) {
    console.log("==========================================");
    console.log("ME2U OTP EMAIL SANDBOX (SMTP NOT CONFIGURED)");
    console.log(`To: ${toEmail}`);
    console.log(`Subject: Your secure Me2U verification code`);
    console.log("------------------------------------------");
    console.log(emailText);
    console.log("==========================================");

    return {
      success: true,
      loggedToConsole: true,
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
      from,
      to: toEmail,
      subject: "Your secure Me2U verification code",
      text: emailText,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to send OTP email via SMTP:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "SMTP transport failure",
    };
  }
}
