/**
 * Me2U SMS OTP Service
 * Self-contained SMS verification using Nigerian SMS providers
 * No external email dependencies - perfect for Nigerian market
 */

// SMS Provider Configuration
const TERMII_API_KEY = process.env.TERMII_API_KEY;
const TERMII_SENDER_ID = process.env.TERMII_SENDER_ID || "Me2U";
const SMS_PROVIDER = process.env.SMS_PROVIDER || "termii"; // termii, bulksms, or sandbox

interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  loggedToConsole?: boolean;
}

/**
 * Send SMS via Termii (Nigerian SMS provider)
 * https://termii.com
 * Pricing: ₦2.50 per SMS (very affordable)
 */
async function sendViaTermii(phone: string, message: string): Promise<SMSResult> {
  if (!TERMII_API_KEY) {
    return {
      success: false,
      error: "Termii API key not configured",
    };
  }

  try {
    const response = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: phone,
        from: TERMII_SENDER_ID,
        sms: message,
        type: "plain",
        channel: "generic",
        api_key: TERMII_API_KEY,
      }),
    });

    const data = await response.json();

    if (data.message === "Successfully Sent" || data.code === "ok") {
      console.log(`✅ SMS sent via Termii to ${phone}`, {
        messageId: data.message_id,
        balance: data.balance,
      });

      return {
        success: true,
        messageId: data.message_id,
      };
    }

    throw new Error(data.message || "Failed to send SMS");
  } catch (error) {
    console.error("❌ Termii SMS failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "SMS delivery failed",
    };
  }
}

/**
 * Send SMS via BulkSMS Nigeria (alternative provider)
 * https://www.bulksmsnigeria.com
 */
async function sendViaBulkSMS(phone: string, message: string): Promise<SMSResult> {
  const BULKSMS_TOKEN = process.env.BULKSMS_TOKEN;

  if (!BULKSMS_TOKEN) {
    return {
      success: false,
      error: "BulkSMS token not configured",
    };
  }

  try {
    const response = await fetch("https://www.bulksmsnigeria.com/api/v1/sms/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BULKSMS_TOKEN}`,
      },
      body: JSON.stringify({
        from: TERMII_SENDER_ID,
        to: phone,
        body: message,
      }),
    });

    const data = await response.json();

    if (data.status === "success") {
      console.log(`✅ SMS sent via BulkSMS to ${phone}`);
      return {
        success: true,
        messageId: data.data?.id,
      };
    }

    throw new Error(data.message || "Failed to send SMS");
  } catch (error) {
    console.error("❌ BulkSMS failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "SMS delivery failed",
    };
  }
}

/**
 * Sandbox mode - log SMS to console (for development)
 */
function sendViaSandbox(phone: string, message: string, code: string): SMSResult {
  console.log("==========================================");
  console.log("ME2U SMS SANDBOX (No SMS provider configured)");
  console.log(`To: ${phone}`);
  console.log("------------------------------------------");
  console.log(message);
  console.log("==========================================");
  console.log("");
  console.log(`✅ OTP CODE (for testing): ${code}`);
  console.log("");
  console.log("To send real SMS, configure one of these providers:");
  console.log("");
  console.log("Option 1: Termii (Recommended for Nigeria)");
  console.log("  1. Sign up: https://termii.com");
  console.log("  2. Get API key from dashboard");
  console.log("  3. Set environment variables:");
  console.log("     SMS_PROVIDER=termii");
  console.log("     TERMII_API_KEY=your_api_key");
  console.log("     TERMII_SENDER_ID=Me2U");
  console.log("  4. Fund account: ₦2.50 per SMS");
  console.log("");
  console.log("Option 2: BulkSMS Nigeria");
  console.log("  1. Sign up: https://www.bulksmsnigeria.com");
  console.log("  2. Get API token");
  console.log("  3. Set environment variables:");
  console.log("     SMS_PROVIDER=bulksms");
  console.log("     BULKSMS_TOKEN=your_token");
  console.log("==========================================");

  return {
    success: true,
    loggedToConsole: true,
  };
}

/**
 * Validate Nigerian phone number
 * Formats: 08012345678, +2348012345678, 2348012345678
 */
export function validateNigerianPhone(phone: string): { valid: boolean; formatted?: string; error?: string } {
  // Remove spaces and dashes
  const cleaned = phone.replace(/[\s-]/g, "");

  // Pattern 1: 08012345678 (11 digits starting with 0)
  if (/^0[7-9][0-1]\d{8}$/.test(cleaned)) {
    return {
      valid: true,
      formatted: `234${cleaned.slice(1)}`, // Convert to international format
    };
  }

  // Pattern 2: 2348012345678 (13 digits starting with 234)
  if (/^234[7-9][0-1]\d{8}$/.test(cleaned)) {
    return {
      valid: true,
      formatted: cleaned,
    };
  }

  // Pattern 3: +2348012345678 (14 chars with +)
  if (/^\+234[7-9][0-1]\d{8}$/.test(cleaned)) {
    return {
      valid: true,
      formatted: cleaned.slice(1), // Remove +
    };
  }

  return {
    valid: false,
    error: "Invalid Nigerian phone number. Use format: 08012345678",
  };
}

/**
 * Send OTP SMS
 */
export async function sendOtpSms(phone: string, code: string): Promise<SMSResult> {
  // Validate and format phone number
  const phoneValidation = validateNigerianPhone(phone);
  if (!phoneValidation.valid) {
    return {
      success: false,
      error: phoneValidation.error,
    };
  }

  const formattedPhone = phoneValidation.formatted!;

  // Validate OTP code
  if (!code || !/^\d{6}$/.test(code)) {
    return {
      success: false,
      error: "Invalid OTP code format (must be 6 digits)",
    };
  }

  // Create message
  const message = `Your Me2U verification code is: ${code}

This code expires in 10 minutes.

Never share this code with anyone. Me2U will never ask for your OTP.

- Me2U Team`;

  // Send via configured provider
  switch (SMS_PROVIDER) {
    case "termii":
      return sendViaTermii(formattedPhone, message);

    case "bulksms":
      return sendViaBulkSMS(formattedPhone, message);

    case "sandbox":
    default:
      return sendViaSandbox(phone, message, code);
  }
}

/**
 * Verify SMS provider configuration
 */
export async function verifySmsConfig(): Promise<{
  configured: boolean;
  provider: string;
  balance?: string;
  error?: string;
}> {
  if (SMS_PROVIDER === "sandbox") {
    return {
      configured: false,
      provider: "sandbox",
      error: "No SMS provider configured (using sandbox mode)",
    };
  }

  if (SMS_PROVIDER === "termii") {
    if (!TERMII_API_KEY) {
      return {
        configured: false,
        provider: "termii",
        error: "TERMII_API_KEY not set",
      };
    }

    try {
      // Check Termii balance
      const response = await fetch(
        `https://api.ng.termii.com/api/get-balance?api_key=${TERMII_API_KEY}`
      );
      const data = await response.json();

      if (data.balance !== undefined) {
        return {
          configured: true,
          provider: "termii",
          balance: `₦${data.balance}`,
        };
      }

      return {
        configured: false,
        provider: "termii",
        error: data.message || "Failed to verify Termii account",
      };
    } catch (error) {
      return {
        configured: false,
        provider: "termii",
        error: error instanceof Error ? error.message : "Connection failed",
      };
    }
  }

  if (SMS_PROVIDER === "bulksms") {
    const BULKSMS_TOKEN = process.env.BULKSMS_TOKEN;
    if (!BULKSMS_TOKEN) {
      return {
        configured: false,
        provider: "bulksms",
        error: "BULKSMS_TOKEN not set",
      };
    }

    return {
      configured: true,
      provider: "bulksms",
    };
  }

  return {
    configured: false,
    provider: "unknown",
    error: `Unknown SMS provider: ${SMS_PROVIDER}`,
  };
}

/**
 * Send notification SMS (for account unlock, transactions, etc.)
 */
export async function sendNotificationSms(
  phone: string,
  message: string
): Promise<SMSResult> {
  const phoneValidation = validateNigerianPhone(phone);
  if (!phoneValidation.valid) {
    return {
      success: false,
      error: phoneValidation.error,
    };
  }

  const formattedPhone = phoneValidation.formatted!;

  switch (SMS_PROVIDER) {
    case "termii":
      return sendViaTermii(formattedPhone, message);

    case "bulksms":
      return sendViaBulkSMS(formattedPhone, message);

    case "sandbox":
    default:
      console.log(`📱 SMS Notification (sandbox): ${message}`);
      return {
        success: true,
        loggedToConsole: true,
      };
  }
}
