/**
 * Timezone utility functions for handling Istanbul timezone
 */

const ISTANBUL_TIMEZONE = 'Europe/Istanbul';

/**
 * Convert a date and time string to Istanbul timezone
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param timeStr - Time string in HH:MM format
 * @returns Date object representing the time in Istanbul, stored as UTC
 */
export function createDateTimeInIstanbul(dateStr: string, timeStr: string): Date {
  // Parse the input as if it's in Istanbul timezone
  const inputDateTime = `${dateStr}T${timeStr}:00`;

  // Create a date assuming it's local time
  const localDate = new Date(inputDateTime);

  // Get what this time would be in Istanbul
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ISTANBUL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  // Get current offset between local time and Istanbul
  const now = new Date();
  const nowInIstanbul = new Date(now.toLocaleString('en-US', { timeZone: ISTANBUL_TIMEZONE }));
  const nowLocal = new Date(now.toLocaleString('en-US'));
  const offsetMs = nowInIstanbul.getTime() - nowLocal.getTime();

  // Apply the offset to convert from "local" interpretation to Istanbul time
  return new Date(localDate.getTime() - offsetMs);
}

/**
 * Get current time in Istanbul timezone
 * @returns Date object representing current time in Istanbul
 */
export function getCurrentTimeInIstanbul(): Date {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: ISTANBUL_TIMEZONE }));
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