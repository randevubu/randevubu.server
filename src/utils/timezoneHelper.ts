/**
 * Timezone utility functions for handling Istanbul timezone
 */

const ISTANBUL_TIMEZONE = 'Europe/Istanbul';

/**
 * Convert a date and time string to Istanbul timezone
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param timeStr - Time string in HH:MM format
 * @returns Date object representing the time in Istanbul (no conversion, treats input as Istanbul time)
 */
export function createDateTimeInIstanbul(dateStr: string, timeStr: string): Date {
  // Parse the date and time - treat directly as Istanbul time
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  
  // Create date directly without any timezone conversion
  // JavaScript Date constructor uses local system time, but we want to ignore that
  // and treat everything as Istanbul time
  return new Date(year, month - 1, day, hour, minute, 0);
}


/**
 * Get current time in Istanbul timezone
 * @returns Date object representing current time in Istanbul timezone
 */
export function getCurrentTimeInIstanbul(): Date {
  // Get current time and format it in Istanbul timezone
  const now = new Date();
  
  // Get the current time components in Istanbul timezone
  const istanbulTimeString = now.toLocaleString("en-US", {
    timeZone: ISTANBUL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Parse this into date components
  const parts = istanbulTimeString.match(/(\d+)\/(\d+)\/(\d+),\s+(\d+):(\d+):(\d+)/);
  if (!parts) return now;
  
  const [, month, day, year, hour, minute, second] = parts.map(Number);
  
  // Return as a Date object in local representation (treating as Istanbul time)
  return new Date(year, month - 1, day, hour, minute, second);
}

/**
 * Convert UTC date to Istanbul timezone for display
 * @param utcDate - UTC date from database
 * @returns Date object adjusted to Istanbul timezone
 */
export function convertUTCToIstanbul(utcDate: Date): Date {
  const istanbulOffset = getIstanbulOffset(utcDate);
  return new Date(utcDate.getTime() + istanbulOffset * 60 * 1000);
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
  // Create a test date in UTC
  const utcDate = new Date(date.getTime());
  
  // Get the same moment in Istanbul timezone
  const istanbulString = utcDate.toLocaleString("en-US", { 
    timeZone: ISTANBUL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const utcString = utcDate.toLocaleString("en-US", { 
    timeZone: "UTC",
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const istanbulTime = new Date(istanbulString);
  const utcTime = new Date(utcString);
  
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

/**
 * Format date for API response (YYYY-MM-DD format, in Istanbul timezone)
 * @param date - Date to format
 * @returns Formatted date string in YYYY-MM-DD format
 */
export function formatDateForAPI(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format time for API response (HH:MM format, in Istanbul timezone)
 * @param date - Date to format
 * @returns Formatted time string in HH:MM format
 */
export function formatTimeForAPI(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format datetime for API response (YYYY-MM-DD HH:MM format, in Istanbul timezone)
 * @param date - Date to format
 * @returns Formatted datetime string in YYYY-MM-DD HH:MM format
 */
export function formatDateTimeForAPI(date: Date): string {
  return `${formatDateForAPI(date)} ${formatTimeForAPI(date)}`;
}

/**
 * Create date range filters for database queries in Istanbul timezone
 * @param startDateStr - Start date string in YYYY-MM-DD format
 * @param endDateStr - End date string in YYYY-MM-DD format
 * @returns Object with gte and lte dates for database filtering
 */
export function createDateRangeFilter(startDateStr: string, endDateStr: string): {
  gte: Date;
  lte: Date;
} {
  // Parse dates as Istanbul timezone (treat as local time)
  const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
  
  // Create start date at beginning of day in Istanbul timezone
  const startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
  
  // Create end date at end of day in Istanbul timezone
  const endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
  
  return {
    gte: startDate,
    lte: endDate
  };
}