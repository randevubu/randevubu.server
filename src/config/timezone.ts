/**
 * Timezone configuration for scalable multi-timezone support
 */

export interface TimezoneConfig {
  defaultTimezone: string;
  supportedTimezones: string[];
  businessTimezones: Record<string, string>; // businessId -> timezone
}

export const TIMEZONE_CONFIG: TimezoneConfig = {
  defaultTimezone: 'Europe/Istanbul',
  supportedTimezones: [
    'Europe/Istanbul',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'America/New_York',
    'America/Los_Angeles',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney'
  ],
  businessTimezones: {
    // Will be populated from database
  }
};

/**
 * Get timezone for a specific business
 * Note: This is a fallback function. Use TimezoneService.getBusinessTimezone() for database queries
 */
export function getBusinessTimezone(businessId: string): string {
  return TIMEZONE_CONFIG.businessTimezones[businessId] || TIMEZONE_CONFIG.defaultTimezone;
}

/**
 * Check if a timezone is supported
 */
export function isTimezoneSupported(timezone: string): boolean {
  return TIMEZONE_CONFIG.supportedTimezones.includes(timezone);
}
