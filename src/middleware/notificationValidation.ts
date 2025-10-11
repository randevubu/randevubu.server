import { PrismaClient } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { NotificationValidationRequest as BaseNotificationValidationRequest } from "../types/request";

const prisma = new PrismaClient();

export interface NotificationValidationRequest extends BaseNotificationValidationRequest {
  body: {
    smsEnabled?: boolean;
    pushEnabled?: boolean;
    emailEnabled?: boolean;
    reminderChannels?: string[];
    enableAppointmentReminders?: boolean;
    reminderTiming?: number[];
    quietHours?: {
      start: string;
      end: string;
    };
    timezone?: string;
  };
}

/**
 * Smart validation middleware for business notification settings
 * Implements auto-sync to handle partial updates correctly
 */
export async function validateNotificationSettings(
  req: NotificationValidationRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      smsEnabled,
      pushEnabled,
      emailEnabled,
      reminderChannels,
      enableAppointmentReminders,
    } = req.body;
    const businessId = req.businessContext?.primaryBusinessId;

    if (!businessId) {
      res.status(400).json({
        success: false,
        error: "Business ID is required for notification settings validation",
      });
      return;
    }

    // Only validate if appointment reminders are enabled
    if (enableAppointmentReminders === false) {
      return next();
    }

    // Get current settings from database
    const currentSettings = await getBusinessNotificationSettings(businessId);

    // Merge with incoming updates
    const updatedSettings = {
      ...currentSettings,
      ...req.body,
    };

    // Determine which channels should be enabled
    const enabledChannels: string[] = [];
    if (updatedSettings.smsEnabled) enabledChannels.push("SMS");
    if (updatedSettings.pushEnabled) enabledChannels.push("PUSH");
    if (updatedSettings.emailEnabled) enabledChannels.push("EMAIL");

    // Auto-sync: ensure all enabled channels are in reminderChannels
    const syncedReminderChannels = [
      ...new Set([
        ...(updatedSettings.reminderChannels || []),
        ...enabledChannels,
      ]),
    ];

    // Remove disabled channels from reminderChannels
    const finalReminderChannels = syncedReminderChannels.filter((channel) => {
      switch (channel) {
        case "SMS":
          return updatedSettings.smsEnabled;
        case "PUSH":
          return updatedSettings.pushEnabled;
        case "EMAIL":
          return updatedSettings.emailEnabled;
        default:
          return true;
      }
    });

    // Update the request body with synced data
    req.body.reminderChannels = finalReminderChannels;

    // Additional validation for business rules
    await validateBusinessRules(updatedSettings, businessId);

    next();
  } catch (error) {
    console.error("Notification validation error:", error);
    res.status(400).json({
      success: false,
      error: {
        message: "Notification settings validation failed",
        code: "VALIDATION_ERROR",
        details:
          error instanceof Error ? error.message : "Unknown validation error",
      },
    });
  }
}

/**
 * Get current business notification settings
 */
async function getBusinessNotificationSettings(businessId: string) {
  const settings = await prisma.businessNotificationSettings.findUnique({
    where: { businessId },
  });

  if (!settings) {
    // Return default settings if none exist
    return {
      enableAppointmentReminders: true,
      reminderChannels: ["PUSH"],
      reminderTiming: [60, 1440],
      smsEnabled: false,
      pushEnabled: true,
      emailEnabled: false,
      timezone: "Europe/Istanbul",
    };
  }

  return {
    enableAppointmentReminders: settings.enableAppointmentReminders,
    reminderChannels: JSON.parse(settings.reminderChannels as string),
    reminderTiming: JSON.parse(settings.reminderTiming as string),
    smsEnabled: settings.smsEnabled,
    pushEnabled: settings.pushEnabled,
    emailEnabled: settings.emailEnabled,
    quietHours: settings.quietHours
      ? JSON.parse(settings.quietHours as string)
      : undefined,
    timezone: settings.timezone,
  };
}

/**
 * Validate business rules for notification settings
 */
async function validateBusinessRules(
  settings: any,
  businessId: string
): Promise<void> {
  // Ensure at least one channel is enabled if appointment reminders are enabled
  if (
    settings.enableAppointmentReminders &&
    settings.reminderChannels.length === 0
  ) {
    throw new Error(
      "At least one reminder channel must be selected when appointment reminders are enabled"
    );
  }

  // Validate that all selected channels are actually enabled
  const enabledChannels: string[] = [];
  if (settings.smsEnabled) enabledChannels.push("SMS");
  if (settings.pushEnabled) enabledChannels.push("PUSH");
  if (settings.emailEnabled) enabledChannels.push("EMAIL");

  const invalidChannels = settings.reminderChannels.filter(
    (channel: string) => !enabledChannels.includes(channel)
  );

  if (invalidChannels.length > 0) {
    throw new Error(
      `The following channels are selected but not enabled: ${invalidChannels.join(
        ", "
      )}`
    );
  }

  // Validate quiet hours if provided
  if (settings.quietHours) {
    const timeFormatRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

    if (
      !timeFormatRegex.test(settings.quietHours.start) ||
      !timeFormatRegex.test(settings.quietHours.end)
    ) {
      throw new Error("Quiet hours must be in HH:MM format (24-hour)");
    }

    const [startHour, startMin] = settings.quietHours.start
      .split(":")
      .map(Number);
    const [endHour, endMin] = settings.quietHours.end.split(":").map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (startMinutes === endMinutes) {
      throw new Error("Quiet hours start and end times cannot be the same");
    }
  }

  // Validate reminder timing if provided
  if (settings.reminderTiming) {
    if (settings.reminderTiming.length === 0) {
      throw new Error("At least one reminder time must be specified");
    }

    if (settings.reminderTiming.length > 5) {
      throw new Error("Maximum 5 reminder times allowed");
    }

    // Check for duplicates
    const sorted = [...settings.reminderTiming].sort((a, b) => a - b);
    const hasDuplicates = sorted.some(
      (time, index) => index > 0 && time === sorted[index - 1]
    );
    if (hasDuplicates) {
      throw new Error("Reminder times must be unique");
    }

    // Validate timing values
    for (const time of settings.reminderTiming) {
      if (!Number.isInteger(time) || time < 5 || time > 10080) {
        throw new Error(
          "Reminder timing must be integers between 5 minutes and 7 days (10080 minutes)"
        );
      }
    }
  }
}

/**
 * Enhanced validation with better error messages (Option 3 from the document)
 * This can be used as an alternative to the auto-sync approach
 */
export async function validateNotificationSettingsWithDetailedErrors(
  req: NotificationValidationRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { smsEnabled, pushEnabled, emailEnabled, reminderChannels } =
      req.body;
    const businessId =
      req.params.businessId || req.businessContext?.primaryBusinessId;

    if (!businessId) {
      res.status(400).json({
        success: false,
        error: "Business ID is required for notification settings validation",
      });
      return;
    }

    // Get current settings
    const currentSettings = await getBusinessNotificationSettings(businessId);
    const mergedSettings = { ...currentSettings, ...req.body };

    // Check for inconsistencies
    const enabledChannels: string[] = [];
    if (mergedSettings.smsEnabled) enabledChannels.push("SMS");
    if (mergedSettings.pushEnabled) enabledChannels.push("PUSH");
    if (mergedSettings.emailEnabled) enabledChannels.push("EMAIL");

    const missingChannels = enabledChannels.filter(
      (channel) => !mergedSettings.reminderChannels.includes(channel)
    );

    if (missingChannels.length > 0) {
      res.status(400).json({
        success: false,
        error: {
          message: `The following enabled channels are missing from reminderChannels: ${missingChannels.join(
            ", "
          )}`,
          code: "CHANNEL_SYNC_REQUIRED",
          details: {
            enabledChannels,
            reminderChannels: mergedSettings.reminderChannels,
            missingChannels,
            suggestions: [
              `Add ${missingChannels.join(", ")} to reminderChannels`,
              "Or disable the corresponding channel toggles",
            ],
          },
        },
      });
      return;
    }

    // Validate business rules
    await validateBusinessRules(mergedSettings, businessId);

    next();
  } catch (error) {
    console.error("Notification validation error:", error);
    res.status(400).json({
      success: false,
      error: {
        message: "Notification settings validation failed",
        code: "VALIDATION_ERROR",
        details:
          error instanceof Error ? error.message : "Unknown validation error",
      },
    });
  }
}
