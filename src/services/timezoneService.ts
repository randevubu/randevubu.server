/**
 * Timezone management service for scalable multi-timezone support
 */

import { PrismaClient } from '@prisma/client';
import { TIMEZONE_CONFIG, isTimezoneSupported } from '../config/timezone';

export class TimezoneService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get timezone for a specific business
   */
  async getBusinessTimezone(businessId: string): Promise<string> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { timezone: true }
    });

    return business?.timezone || TIMEZONE_CONFIG.defaultTimezone;
  }

  /**
   * Update business timezone
   */
  async updateBusinessTimezone(businessId: string, timezone: string): Promise<void> {
    if (!isTimezoneSupported(timezone)) {
      throw new Error(`Unsupported timezone: ${timezone}`);
    }

    await this.prisma.business.update({
      where: { id: businessId },
      data: { timezone }
    });
  }

  /**
   * Get all supported timezones
   */
  getSupportedTimezones(): string[] {
    return TIMEZONE_CONFIG.supportedTimezones;
  }

  /**
   * Get timezone info for a specific timezone
   */
  getTimezoneInfo(timezone: string): {
    name: string;
    offset: string;
    isSupported: boolean;
  } {
    const isSupported = isTimezoneSupported(timezone);
    const now = new Date();
    const offset = this.getTimezoneOffset(now, timezone);
    
    return {
      name: timezone,
      offset: this.formatOffset(offset),
      isSupported
    };
  }

  /**
   * Get timezone offset in minutes
   */
  private getTimezoneOffset(date: Date, timezone: string): number {
    const utcTime = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
    const timezoneTime = new Date(date.toLocaleString("en-US", { timeZone: timezone }));
    return (timezoneTime.getTime() - utcTime.getTime()) / (1000 * 60);
  }

  /**
   * Format timezone offset as string
   */
  private formatOffset(offsetMinutes: number): string {
    const hours = Math.floor(Math.abs(offsetMinutes) / 60);
    const minutes = Math.abs(offsetMinutes) % 60;
    const sign = offsetMinutes >= 0 ? '+' : '-';
    
    if (minutes === 0) {
      return `${sign}${hours}:00`;
    }
    return `${sign}${hours}:${minutes.toString().padStart(2, '0')}`;
  }

  /**
   * Get businesses by timezone
   */
  async getBusinessesByTimezone(timezone: string): Promise<Array<{ id: string; name: string }>> {
    return this.prisma.business.findMany({
      where: { timezone },
      select: { id: true, name: true }
    });
  }

  /**
   * Get timezone statistics
   */
  async getTimezoneStatistics(): Promise<Record<string, number>> {
    const stats = await this.prisma.business.groupBy({
      by: ['timezone'],
      _count: { timezone: true }
    });

    return stats.reduce((acc, stat) => {
      acc[stat.timezone] = stat._count.timezone;
      return acc;
    }, {} as Record<string, number>);
  }
}

