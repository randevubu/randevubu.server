import { SMSMessageTemplates } from "../../../utils/smsMessageTemplates";
import { Netgsm } from '@netgsm/sms';

import { SMSSendOptions, SMSResponse } from '../../../types/sms';
import logger from "../../../utils/Logger/logger";
export class SMSService {
  private readonly netgsm: Netgsm;
  private readonly sender: string;
  private readonly username: string;
  private readonly password: string;

  constructor() {
    // Get raw credentials from environment
    const rawUsername = process.env.NETGSM_USERNAME || "";
    const rawPassword = process.env.NETGSM_PASSWORD || "";
    const rawSender = process.env.NETGSM_MSGHEADER || "";

    // Trim credentials to remove accidental whitespace
    this.username = rawUsername.trim();
    this.password = rawPassword.trim();
    this.sender = rawSender.trim();

    // Log credential status (masked for security) with detailed debugging
    const maskedUsername = this.username ? `${this.username.substring(0, 3)}***${this.username.slice(-2)}` : "NOT SET";
    const maskedPassword = this.password ? "***" : "NOT SET";
    const maskedSender = this.sender || "NOT SET";

    logger.info("SMS Service: Initializing NetGSM", {
      usernameConfigured: !!this.username,
      passwordConfigured: !!this.password,
      senderConfigured: !!this.sender,
      maskedUsername,
      maskedSender,
      usernameLength: this.username.length,
      passwordLength: this.password.length,
      senderLength: this.sender.length,
      // Debug: Check for raw vs trimmed differences
      usernameTrimmed: rawUsername !== this.username,
      passwordTrimmed: rawPassword !== this.password,
      senderTrimmed: rawSender !== this.sender,
    });

    if (!this.username || !this.password) {
      logger.warn(
        "SMS API credentials not configured. SMS sending will be disabled.",
        {
          hasUsername: !!this.username,
          hasPassword: !!this.password,
          hasSender: !!this.sender,
          usernameRaw: `"${rawUsername}"`,
          usernameLength: rawUsername.length,
          passwordLength: rawPassword.length,
        }
      );
    }

    try {
      this.netgsm = new Netgsm({
        username: this.username,
        password: this.password
      });
      
      logger.debug("SMS Service: NetGSM client initialized successfully", {
        usernameConfigured: !!this.username,
        passwordConfigured: !!this.password,
      });
    } catch (error) {
      logger.error("SMS Service: Failed to initialize NetGSM client", {
        error: error instanceof Error ? error.message : String(error),
        username: this.username,
        hasPassword: !!this.password,
      });
      // Initialize with empty credentials to prevent crashes
      this.netgsm = new Netgsm({
        username: "",
        password: ""
      });
    }
  }

  async sendSMS(options: SMSSendOptions): Promise<SMSResponse> {
    const { phoneNumber, message, context } = options;

    const maskedUsername = this.username ? `${this.username.substring(0, 3)}***${this.username.slice(-2)}` : "NOT SET";
    
    logger.info("SMS Service: Starting SMS send process", {
      phoneNumber: this.maskPhoneNumber(phoneNumber),
      messageLength: message.length,
      hasCredentials: !!(this.username && this.password),
      hasSender: !!this.sender,
      maskedUsername,
      sender: this.sender || "Not configured",
      requestId: context?.requestId,
    });

    // Check credentials are loaded
    if (!this.username || !this.password) {
      const errorMsg = "SMS credentials not found in environment variables. Please check NETGSM_USERNAME and NETGSM_PASSWORD.";
      logger.error("SMS Service: " + errorMsg, {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        hasUsername: !!this.username,
        hasPassword: !!this.password,
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
        logger.debug("SMS Service: About to call NetGSM.sendRestSms()", {
          msgheaderLength: this.sender.length,
          messageLength: message.length,
          phoneNumberLength: normalizedPhone.length,
        });

        response = await this.netgsm.sendRestSms({
          msgheader: this.sender,
          encoding: 'TR',  // Turkish character support
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
        
        // Enhanced error logging with credential validation info
        const credentialValidation = this.validateCredentials();
        
        logger.error("SMS Service: NetGSM API call failed", {
          phoneNumber: this.maskPhoneNumber(normalizedPhone),
          error: errorMsg,
          errorDetails: errorDetails ? JSON.stringify(errorDetails) : undefined,
          errorType: apiError instanceof Error ? apiError.constructor.name : typeof apiError,
          requestId: context?.requestId,
          // Add credential diagnostic info
          credentialValidationIssues: credentialValidation.issues,
          credentialDetails: credentialValidation.details,
        });
        if (errorDetails) {
          logger.error("NetGSM API error details", {
            errorDetails: JSON.stringify(errorDetails),
            requestId: context?.requestId,
            // Also include credential info here
            credentialValidation: credentialValidation,
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
      // Input: E.164 format like "+905466604336" (from phoneVerificationService)
      // NetGSM requires: format like "5466604336" (without country code and leading +)
      
      // Remove all non-digit characters
      const digits = phoneNumber.replace(/\D/g, "");

      // Handle Turkish phone numbers - NetGSM expects format: 5xxxxxxxxx
      if (digits.startsWith("90")) {
        // Has country code (90), remove it and keep the rest
        const withoutCountryCode = digits.substring(2);
        if (
          withoutCountryCode.startsWith("5") &&
          withoutCountryCode.length === 10
        ) {
          return withoutCountryCode;
        }
      } else if (digits.startsWith("0")) {
        // Has leading 0, remove it and keep the rest
        const withoutZero = digits.substring(1);
        if (withoutZero.startsWith("5") && withoutZero.length === 10) {
          return withoutZero;
        }
      } else if (digits.startsWith("5") && digits.length === 10) {
        // Already in correct format (5xxxxxxxxx)
        return digits;
      }

      logger.warn("Phone number format not recognized", {
        originalPhone: this.maskPhoneNumber(phoneNumber),
        digits,
        length: digits.length,
      });
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

  /**
   * Validate credentials and provide detailed diagnostic information
   */
  validateCredentials(): {
    valid: boolean;
    issues: string[];
    details: {
      usernameSet: boolean;
      passwordSet: boolean;
      senderSet: boolean;
      usernameLength: number;
      passwordLength: number;
      senderLength: number;
      usernameStartsWith: string;
      hasSpecialChars: boolean;
    };
  } {
    const issues: string[] = [];

    if (!this.username) {
      issues.push("NETGSM_USERNAME is not set");
    } else if (this.username.length < 3) {
      issues.push("NETGSM_USERNAME appears to be too short");
    }

    if (!this.password) {
      issues.push("NETGSM_PASSWORD is not set");
    } else if (this.password.length < 6) {
      issues.push("NETGSM_PASSWORD appears to be too short");
    }

    if (!this.sender) {
      issues.push("NETGSM_MSGHEADER is not set");
    }

    const hasSpecialChars = /[^a-zA-Z0-9._-]/.test(this.username + this.password);

    return {
      valid: issues.length === 0,
      issues,
      details: {
        usernameSet: !!this.username,
        passwordSet: !!this.password,
        senderSet: !!this.sender,
        usernameLength: this.username.length,
        passwordLength: this.password.length,
        senderLength: this.sender.length,
        usernameStartsWith: this.username.substring(0, 1),
        hasSpecialChars,
      },
    };
  }
}
