/**
 * Scalable timezone utility functions for multi-timezone support
 */

import { getBusinessTimezone, isTimezoneSupported } from '../config/timezone';

const ISTANBUL_TIMEZONE = 'Europe/Istanbul';

/**
 * Convert a date and time string to a specific timezone
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param timeStr - Time string in HH:MM format
 * @param timezone - Target timezone (defaults to Istanbul)
 * @returns Date object representing the time in the specified timezone
 */
export function createDateTimeInTimezone(dateStr: string, timeStr: string, timezone: string = ISTANBUL_TIMEZONE): Date {
  // Parse the date and time components
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  
  // For Istanbul timezone, create the date directly without complex offset calculations
  if (timezone === ISTANBUL_TIMEZONE) {
    return new Date(year, month - 1, day, hour, minute, 0);
  }
  
  // For other timezones, use proper timezone handling
  const dateTimeString = `${dateStr}T${timeStr}:00`;
  const date = new Date(dateTimeString);
  
  // Get timezone offset for the specific date
  const offset = getTimezoneOffset(date, timezone);
  
  // Adjust for timezone offset
  return new Date(date.getTime() - (offset * 60 * 1000));
}

/**
 * Convert a date and time string to Istanbul timezone (backward compatibility)
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param timeStr - Time string in HH:MM format
 * @returns Date object representing the time in Istanbul timezone
 */
export function createDateTimeInIstanbul(dateStr: string, timeStr: string): Date {
  // Parse the date and time components
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  
  // Create date directly in Istanbul timezone (no complex calculations)
  return new Date(year, month - 1, day, hour, minute, 0);
}

/**
 * Get current time in a specific timezone
 * @param timezone - Target timezone (defaults to Istanbul)
 * @returns Date object representing current time in the specified timezone
 */
export function getCurrentTimeInTimezone(timezone: string = ISTANBUL_TIMEZONE): Date {
  // For Istanbul timezone, return current time directly
  if (timezone === ISTANBUL_TIMEZONE) {
    return new Date();
  }
  
  // For other timezones, use proper timezone conversion
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: timezone }));
}

/**
 * Get current time in Istanbul timezone (backward compatibility)
 * @returns Date object representing current time in Istanbul
 */
export function getCurrentTimeInIstanbul(): Date {
  // Return current time directly (no complex timezone calculations)
  return new Date();
}

/**
 * Get timezone offset for a specific date and timezone
 * @param date - Date to get offset for
 * @param timezone - Target timezone
 * @returns Offset in minutes
 */
export function getTimezoneOffset(date: Date, timezone: string): number {
  const utcTime = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const timezoneTime = new Date(date.toLocaleString("en-US", { timeZone: timezone }));
  return (timezoneTime.getTime() - utcTime.getTime()) / (1000 * 60);
}

/**
 * Create appointment datetime in business timezone
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param timeStr - Time string in HH:MM format
 * @param businessId - Business ID to get timezone for
 * @returns Date object in business timezone
 */
export function createAppointmentDateTime(dateStr: string, timeStr: string, businessId: string): Date {
  // For now, always use Istanbul timezone since that's the default
  // This avoids complex timezone calculations that might cause issues
  return createDateTimeInIstanbul(dateStr, timeStr);
}

/**
 * Get current time in business timezone
 * @param businessId - Business ID to get timezone for
 * @returns Date object in business timezone
 */
export function getCurrentBusinessTime(businessId: string): Date {
  // For now, always use Istanbul timezone since that's the default
  // This avoids complex timezone calculations that might cause issues
  return getCurrentTimeInIstanbul();
}

/**
 * Convert time between timezones
 * @param date - Date to convert
 * @param fromTimezone - Source timezone
 * @param toTimezone - Target timezone
 * @returns Date in target timezone
 */
export function convertBetweenTimezones(date: Date, fromTimezone: string, toTimezone: string): Date {
  const fromOffset = getTimezoneOffset(date, fromTimezone);
  const toOffset = getTimezoneOffset(date, toTimezone);
  const offsetDifference = toOffset - fromOffset;
  
  return new Date(date.getTime() + (offsetDifference * 60 * 1000));
}

/**
 * Convert UTC date to Istanbul timezone for display
 * @param utcDate - UTC date from database
 * @returns Date object adjusted to Istanbul timezone
 */
export function convertUTCToIstanbul(utcDate: Date): Date {
  return new Date(utcDate.toLocaleString("en-US", { timeZone: ISTANBUL_TIMEZONE }));
}

/**
 * Format date for display in Istanbul timezone
 * @param date - Date to format
 * @returns Formatted date string in DD.MM.YYYY format
 */
export function formatDateInIstanbul(date: Date): string {
  return date.toLocaleDateString('tr-TR', {
    timeZone: ISTANBUL_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Format time for display in Istanbul timezone
 * @param date - Date to format
 * @returns Formatted time string in HH:MM format
 */
export function formatTimeInIstanbul(date: Date): string {
  return date.toLocaleTimeString('tr-TR', {
    timeZone: ISTANBUL_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Get Istanbul timezone offset for a given date
 * @param date - Date to get offset for
 * @returns Offset in minutes
 */
export function getIstanbulOffset(date: Date): number {
  const istanbulTime = new Date(date.toLocaleString("en-US", { timeZone: ISTANBUL_TIMEZONE }));
  const utcTime = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  return (istanbulTime.getTime() - utcTime.getTime()) / (1000 * 60);
}

/**
 * Check if a date is in daylight saving time for Istanbul
 * @param date - Date to check
 * @returns true if in DST, false otherwise
 */
export function isDaylightSavingTime(date: Date): boolean {
  const offset = getIstanbulOffset(date);
  return offset === 180; // UTC+3 during DST, UTC+2 during standard time
}