import logger from "../../../utils/Logger/logger";
import { SMSMessageTemplates } from "../../../utils/smsMessageTemplates";
import { Netgsm } from '@netgsm/sms';

import { SMSSendOptions, SMSResponse } from '../../../types/sms';

export class SMSService {
  private readonly netgsm: Netgsm;
  private readonly sender: string;

  constructor() {
    const username = process.env.NETGSM_USERNAME || "";
    const password = process.env.NETGSM_PASSWORD || "";
    this.sender = process.env.NETGSM_MSGHEADER || "";

    // Log credential status (masked for security)
    const maskedUsername = username ? `${username.substring(0, 3)}***${username.slice(-2)}` : "NOT SET";
    const maskedPassword = password ? "***" : "NOT SET";
    const maskedSender = this.sender || "NOT SET";

    logger.info("SMS Service: Initializing NetGSM", {
      usernameConfigured: !!username,
      passwordConfigured: !!password,
      senderConfigured: !!this.sender,
      maskedUsername,
      maskedSender,
    });

    if (!username || !password) {
      logger.warn(
        "SMS API credentials not configured. SMS sending will be disabled.",
        {
          hasUsername: !!username,
          hasPassword: !!password,
          hasSender: !!this.sender,
        }
      );
    }

    this.netgsm = new Netgsm({
      username,
      password
    });
  }

  async sendSMS(options: SMSSendOptions): Promise<SMSResponse> {
    const { phoneNumber, message, context } = options;

    // Verify credentials are loaded
    const username = process.env.NETGSM_USERNAME || "";
    const password = process.env.NETGSM_PASSWORD || "";
    const maskedUsername = username ? `${username.substring(0, 3)}***${username.slice(-2)}` : "NOT SET";
    
      logger.info("SMS Service: Starting SMS send process", {
      phoneNumber: this.maskPhoneNumber(phoneNumber),
      messageLength: message.length,
      hasCredentials: !!(username && password),
      hasSender: !!this.sender,
      maskedUsername,
      sender: this.sender || "Not configured",
      requestId: context?.requestId,
    });

    // Double-check credentials at runtime
    if (!username || !password) {
      const errorMsg = "SMS credentials not found in environment variables. Please check NETGSM_USERNAME and NETGSM_PASSWORD.";
      logger.error("SMS Service: " + errorMsg, {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        hasUsername: !!username,
        hasPassword: !!password,
        requestId: context?.requestId,
      });
      
      return {
        success: false,
        error: errorMsg,
      };
    }

    // Check if sender is configured
    if (!this.sender) {
      const errorMsg = "SMS sender (MSGHEADER) not configured. Please set NETGSM_MSGHEADER environment variable.";
      logger.error("SMS Service: " + errorMsg, {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        requestId: context?.requestId,
      });

      return {
        success: false,
        error: errorMsg,
      };
    }

    try {
      // Normalize phone number for Turkish format
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      if (!normalizedPhone) {
        const errorMsg = `Invalid phone number format: ${phoneNumber}`;
        logger.error("SMS Service: " + errorMsg, {
          originalPhone: phoneNumber,
          requestId: context?.requestId,
        });

        return {
          success: false,
          error: errorMsg,
        };
      }

      logger.info("SMS Service: Sending SMS via NetGSM", {
        originalPhone: phoneNumber,
        normalizedPhone: this.maskPhoneNumber(normalizedPhone),
        messageLength: message.length,
        sender: this.sender,
        requestId: context?.requestId,
      });

      // Send SMS using NetGSM API
      let response;
      try {
        response = await this.netgsm.sendRestSms({
          msgheader: this.sender,
          messages: [
            {
              msg: message,
              no: normalizedPhone
            }
          ]
        });
      } catch (apiError) {
        // Handle NetGSM API call errors
        let errorMsg: string;
        let errorDetails: any = null;
        
        if (apiError instanceof Error) {
          errorMsg = apiError.message;
        } else if (typeof apiError === 'object' && apiError !== null) {
          errorDetails = apiError;
          // Try to parse NetGSM error response
          if ('description' in apiError) {
            const netgsmError = apiError as any;
            if (netgsmError.code === '30' || netgsmError.description === 'credentialError') {
              errorMsg = `NetGSM Credential Error: Invalid username or password. Please verify NETGSM_USERNAME and NETGSM_PASSWORD are correct. (Code: ${netgsmError.code || 'N/A'})`;
            } else {
              errorMsg = `NetGSM API Error (Code: ${netgsmError.code || 'N/A'}): ${netgsmError.description || 'Unknown error'}`;
            }
          } else {
            errorMsg = JSON.stringify(apiError);
          }
        } else {
          errorMsg = String(apiError);
        }
        
        logger.error("SMS Service: NetGSM API call failed", {
          phoneNumber: this.maskPhoneNumber(normalizedPhone),
          error: errorMsg,
          errorDetails: errorDetails ? JSON.stringify(errorDetails) : undefined,
          errorType: apiError instanceof Error ? apiError.constructor.name : typeof apiError,
          requestId: context?.requestId,
        });
        if (errorDetails) {
          logger.error("NetGSM API error details", {
            errorDetails: JSON.stringify(errorDetails),
            requestId: context?.requestId,
          });
        }

        return {
          success: false,
          error: errorMsg,
        };
      }

      // Validate response structure
      if (!response || typeof response !== 'object') {
        const errorMsg = `Invalid response from NetGSM API: ${JSON.stringify(response)}`;
        logger.error("SMS Service: " + errorMsg, {
          phoneNumber: this.maskPhoneNumber(normalizedPhone),
          response: response,
          requestId: context?.requestId,
        });

        return {
          success: false,
          error: errorMsg,
        };
      }

      logger.info("SMS Service: NetGSM API response received", {
        phoneNumber: this.maskPhoneNumber(normalizedPhone),
        responseCode: response.code,
        responseDescription: response.description,
        jobId: response.jobid,
        fullResponse: JSON.stringify(response),
        requestId: context?.requestId,
      });

      // NetGSM returns code "00" for success
      if (response.code === "00") {
        logger.info("SMS Service: SMS sent successfully via NetGSM", {
          phoneNumber: this.maskPhoneNumber(normalizedPhone),
          messageId: response.jobid,
          requestId: context?.requestId,
        });

        return {
          success: true,
          messageId: response.jobid,
        };
      } else {
        const errorMsg = `NetGSM API Error (Code: ${response.code || 'N/A'}): ${response.description || "Unknown error"}`;
        logger.error("SMS Service: " + errorMsg, {
          phoneNumber: this.maskPhoneNumber(normalizedPhone),
          responseCode: response.code,
          responseDescription: response.description,
          fullResponse: JSON.stringify(response),
          requestId: context?.requestId,
        });
        logger.error("Full NetGSM response", {
          response: JSON.stringify(response),
          requestId: context?.requestId,
        });

        return {
          success: false,
          error: errorMsg,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logger.error("SMS Service: Exception occurred while sending SMS", {
        error: errorMessage,
        stack: errorStack,
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        requestId: context?.requestId,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private normalizePhoneNumber(phoneNumber: string): string | null {
    try {
      // Remove all non-digit characters
      const digits = phoneNumber.replace(/\D/g, "");

      // Handle Turkish phone numbers - NetGSM expects format: 5xxxxxxxxx
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
    const testMessage = SMSMessageTemplates.test.serviceTest();

    return this.sendSMS({
      phoneNumber,
      message: testMessage,
      context: { requestId: "test" },
    });
  }
}
