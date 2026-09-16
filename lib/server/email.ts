import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// SMTP Configuration - Works with Gmail, Outlook, Yahoo, or any SMTP server
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_SECURE = process.env.SMTP_SECURE === "true"; // true for 465, false for other ports
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const FROM_EMAIL = process.env.EMAIL_FROM || "Me2U <noreply@me2u.app>";
const SMTP_CONFIGURED = !!(SMTP_USER && SMTP_PASSWORD);

let transporter: Transporter | null = null;

// Initialize transporter lazily
function getTransporter(): Transporter | null {
  if (!SMTP_CONFIGURED) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      },
      // Connection timeout
      connectionTimeout: 10000,
      // Greeting timeout
      greetingTimeout: 10000,
      // Socket timeout
      socketTimeout: 10000,
      // Enable debug logging in development
      debug: process.env.NODE_ENV === "development",
      logger: process.env.NODE_ENV === "development",
    });
  }

  return transporter;
}

// Validate email format
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function sendOtpEmail(
  toEmail: string, 
  code: string
): Promise<{ success: boolean; error?: string; loggedToConsole?: boolean }> {
  // Validate inputs
  if (!toEmail || !isValidEmail(toEmail)) {
    return {
      success: false,
      error: "Invalid email address",
    };
  }

  if (!code || !/^\d{6}$/.test(code)) {
    return {
      success: false,
      error: "Invalid OTP code format (must be 6 digits)",
    };
  }
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

  // Get transporter
  const smtp = getTransporter();

  if (!smtp) {
    console.log("==========================================");
    console.log("ME2U OTP EMAIL SANDBOX (SMTP NOT CONFIGURED)");
    console.log(`To: ${toEmail}`);
    console.log(`Subject: Your secure Me2U verification code`);
    console.log("------------------------------------------");
    console.log(emailText);
    console.log("==========================================");
    console.log("");
    console.log("✅ OTP CODE (for testing): " + code);
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
    // Verify SMTP connection before sending
    if (process.env.NODE_ENV === "development") {
      try {
        await smtp.verify();
        console.log("✅ SMTP connection verified");
      } catch (verifyError) {
        console.warn("⚠️  SMTP verification failed (will try sending anyway):", verifyError);
      }
    }

    const info = await smtp.sendMail({
      from: FROM_EMAIL,
      to: toEmail,
      subject: "Your secure Me2U verification code",
      html: emailHtml,
      text: emailText,
      // Add headers
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
      },
    });

    console.log(`✅ Email sent successfully to ${toEmail}`, {
      messageId: info.messageId,
      response: info.response,
    });

    return { success: true };
  } catch (error) {
    console.error("❌ Failed to send OTP email via SMTP:", error);
    
    // Provide helpful error messages
    let errorMessage = "Email delivery failure";
    
    if (error instanceof Error) {
      const errorStr = error.message.toLowerCase();
      
      if (errorStr.includes("invalid login") || errorStr.includes("authentication failed")) {
        errorMessage = "SMTP authentication failed. Check SMTP_USER and SMTP_PASSWORD";
      } else if (errorStr.includes("connection timeout") || errorStr.includes("etimedout")) {
        errorMessage = "SMTP connection timeout. Check SMTP_HOST and SMTP_PORT";
      } else if (errorStr.includes("self signed certificate")) {
        errorMessage = "SSL certificate error. Try SMTP_SECURE=false";
      } else if (errorStr.includes("no recipients")) {
        errorMessage = "Invalid recipient email address";
      } else {
        errorMessage = error.message;
      }
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}


/**
 * Verify SMTP connection without sending email
 */
export async function verifyEmailConfig(): Promise<{
  configured: boolean;
  connected: boolean;
  error?: string;
  config?: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
  };
}> {
  if (!SMTP_CONFIGURED) {
    return {
      configured: false,
      connected: false,
      error: "SMTP credentials not configured",
    };
  }

  const smtp = getTransporter();
  if (!smtp) {
    return {
      configured: false,
      connected: false,
      error: "Failed to create SMTP transporter",
    };
  }

  try {
    await smtp.verify();
    return {
      configured: true,
      connected: true,
      config: {
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        user: SMTP_USER || "not set",
      },
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      error: error instanceof Error ? error.message : "Connection verification failed",
      config: {
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        user: SMTP_USER || "not set",
      },
    };
  }
}
