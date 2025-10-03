import { ErrorContext } from "../types/errors";
import { logger } from "../utils/Logger/logger";

export interface SMSSendOptions {
  phoneNumber: string;
  message: string;
  context?: ErrorContext;
}

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class SMSService {
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly sender: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = process.env.ILETI_MERKEZI_API_KEY || "";
    this.secretKey = process.env.ILETI_MERKEZI_SECRET_KEY || "";
    this.sender = process.env.ILETI_MERKEZI_SENDER || "APITEST";
    this.baseUrl = "https://api.iletimerkezi.com/v1/send-sms/get/";

    if (!this.apiKey || !this.secretKey) {
      logger.warn(
        "SMS API credentials not configured. SMS sending will be disabled."
      );
    }
  }

  async sendSMS(options: SMSSendOptions): Promise<SMSResponse> {
    const { phoneNumber, message, context } = options;

    // In development mode, still try to send real SMS for testing
    // Comment out this block to enable real SMS sending in development
    /*
    if (process.env.NODE_ENV === 'development') {
      logger.info('SMS (Development Mode)', {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        message,
        sender: this.sender,
        requestId: context?.requestId,
      });
      
      return {
        success: true,
        messageId: `dev_${Date.now()}`,
      };
    }
    */

    // Check if credentials are configured
    if (!this.apiKey || !this.secretKey) {
      logger.error("SMS API credentials not configured", {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        requestId: context?.requestId,
      });

      return {
        success: false,
        error: "SMS service not configured",
      };
    }

    try {
      // Normalize phone number for Turkish format
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      if (!normalizedPhone) {
        return {
          success: false,
          error: "Invalid phone number format",
        };
      }

      // Create hash for authentication
      const hash = this.createHash(this.apiKey, this.secretKey);

      // URL encode the message text properly
      const encodedMessage = encodeURIComponent(message);
      const encodedSender = encodeURIComponent(this.sender);

      // Build the API URL with parameters according to İleti Merkezi documentation
      const apiUrl = `${this.baseUrl}?key=${this.apiKey}&hash=${hash}&text=${encodedMessage}&receipents=${normalizedPhone}&sender=${encodedSender}&iys=1&iysList=BIREYSEL`;

      logger.info("Sending SMS via İleti Merkezi", {
        phoneNumber: this.maskPhoneNumber(normalizedPhone),
        messageLength: message.length,
        sender: this.sender,
        requestId: context?.requestId,
      });

      // Make the API request
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/xml",
        },
      });

      const responseText = await response.text();

      if (!response.ok) {
        logger.error("SMS API request failed", {
          status: response.status,
          statusText: response.statusText,
          response: responseText,
          phoneNumber: this.maskPhoneNumber(normalizedPhone),
          requestId: context?.requestId,
        });

        return {
          success: false,
          error: `API request failed: ${response.status} ${response.statusText}`,
        };
      }

      // Parse XML response
      const result = this.parseXMLResponse(responseText);

      if (result.success) {
        logger.info("SMS sent successfully", {
          phoneNumber: this.maskPhoneNumber(normalizedPhone),
          messageId: result.messageId,
          requestId: context?.requestId,
        });
      } else {
        logger.error("SMS sending failed", {
          phoneNumber: this.maskPhoneNumber(normalizedPhone),
          error: result.error,
          response: responseText,
          requestId: context?.requestId,
        });
      }

      return result;
    } catch (error) {
      logger.error("SMS sending error", {
        error: error instanceof Error ? error.message : String(error),
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        requestId: context?.requestId,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private normalizePhoneNumber(phoneNumber: string): string | null {
    try {
      // Remove all non-digit characters
      const digits = phoneNumber.replace(/\D/g, "");

      // Handle Turkish phone numbers - İleti Merkezi expects format: 5xxxxxxxxx
      if (digits.startsWith("90")) {
        // Has country code, remove it and return the rest
        const withoutCountryCode = digits.substring(2);
        if (
          withoutCountryCode.startsWith("5") &&
          withoutCountryCode.length === 10
        ) {
          return withoutCountryCode;
        }
      } else if (digits.startsWith("0")) {
        // Remove leading 0
        const withoutZero = digits.substring(1);
        if (withoutZero.startsWith("5") && withoutZero.length === 10) {
          return withoutZero;
        }
      } else if (digits.startsWith("5") && digits.length === 10) {
        // Already in correct format
        return digits;
      }

      return null;
    } catch (error) {
      logger.warn("Phone number normalization failed", {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private createHash(apiKey: string, secretKey: string): string {
    // Use the hash directly from environment variables
    // The secretKey in .env is actually the hash value
    return secretKey;
  }

  private parseXMLResponse(xmlResponse: string): SMSResponse {
    try {
      // Simple XML parsing for the response
      const codeMatch = xmlResponse.match(/<code>(\d+)<\/code>/);
      const messageMatch = xmlResponse.match(/<message>(.*?)<\/message>/);
      const idMatch = xmlResponse.match(/<id>(\d+)<\/id>/);

      const code = codeMatch ? parseInt(codeMatch[1]) : 0;
      const message = messageMatch ? messageMatch[1] : "";
      const messageId = idMatch ? idMatch[1] : undefined;

      if (code === 200) {
        return {
          success: true,
          messageId,
        };
      } else {
        return {
          success: false,
          error: `API Error ${code}: ${message}`,
        };
      }
    } catch (error) {
      logger.error("Failed to parse SMS API response", {
        error: error instanceof Error ? error.message : String(error),
        response: xmlResponse,
      });

      return {
        success: false,
        error: "Failed to parse API response",
      };
    }
  }

  private maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length < 4) {
      return "*".repeat(phoneNumber.length);
    }

    const visibleDigits = 3;
    const maskedPart = "*".repeat(phoneNumber.length - visibleDigits);
    return maskedPart + phoneNumber.slice(-visibleDigits);
  }

  // Test method to verify SMS service configuration
  async testSMS(phoneNumber: string): Promise<SMSResponse> {
    const testMessage =
      "RandevuBu SMS servisi test mesajıdır. Bu mesaj İleti Merkezi API entegrasyonunu test etmek için gönderilmiştir.";

    return this.sendSMS({
      phoneNumber,
      message: testMessage,
      context: { requestId: "test" },
    });
  }
}
