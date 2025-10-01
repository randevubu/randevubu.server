import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/Logger/logger";

export interface BusinessHoursJSON {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
}

export interface DayHours {
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
  breaks?: Array<{
    startTime: string;
    endTime: string;
    description?: string;
  }>;
}

export class WorkingHoursService {
  // Day of week mapping for working hours
  private readonly DAY_OF_WEEK_MAP = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 0,
  };

  constructor(private prisma: PrismaClient) {}

  /**
   * Create default working hours for a business (9AM-6PM, Mon-Fri)
   */
  async createDefaultBusinessHours(businessId: string): Promise<void> {
    const defaultHours = {
      monday: { isOpen: true, openTime: "09:00", closeTime: "18:00" },
      tuesday: { isOpen: true, openTime: "09:00", closeTime: "18:00" },
      wednesday: { isOpen: true, openTime: "09:00", closeTime: "18:00" },
      thursday: { isOpen: true, openTime: "09:00", closeTime: "18:00" },
      friday: { isOpen: true, openTime: "09:00", closeTime: "18:00" },
      saturday: { isOpen: false, openTime: "10:00", closeTime: "16:00" },
      sunday: { isOpen: false, openTime: "10:00", closeTime: "16:00" },
    };

    await this.createWorkingHoursFromJSON(businessId, defaultHours);
    logger.info("Created default business working hours", { businessId });
  }

  /**
   * Create default working hours for a staff member (same as business hours)
   */
  async createDefaultStaffHours(
    businessId: string,
    staffId: string
  ): Promise<void> {
    // Get business working hours first
    const businessHours = await this.getBusinessWorkingHours(businessId);

    if (businessHours.length === 0) {
      // If business has no working hours, create default ones first
      await this.createDefaultBusinessHours(businessId);
      // Then get them again
      const newBusinessHours = await this.getBusinessWorkingHours(businessId);
      await this.copyBusinessHoursToStaff(
        businessId,
        staffId,
        newBusinessHours
      );
    } else {
      await this.copyBusinessHoursToStaff(businessId, staffId, businessHours);
    }

    logger.info("Created default staff working hours", { businessId, staffId });
  }

  /**
   * Convert JSON business hours to WorkingHours records
   */
  async createWorkingHoursFromJSON(
    businessId: string,
    hoursJSON: BusinessHoursJSON,
    staffId?: string
  ): Promise<void> {
    const workingHoursData = [];

    for (const [dayName, dayHours] of Object.entries(hoursJSON)) {
      if (!dayHours || !this.DAY_OF_WEEK_MAP.hasOwnProperty(dayName)) continue;

      const dayOfWeek =
        this.DAY_OF_WEEK_MAP[dayName as keyof typeof this.DAY_OF_WEEK_MAP];

      // Only create records for days that are open
      if (dayHours.isOpen && dayHours.openTime && dayHours.closeTime) {
        workingHoursData.push({
          id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
          businessId,
          staffId: staffId || undefined,
          dayOfWeek,
          startTime: dayHours.openTime,
          endTime: dayHours.closeTime,
          isActive: true,
          breaks: dayHours.breaks || undefined,
        });
      }
    }

    if (workingHoursData.length > 0) {
      await this.prisma.workingHours.createMany({
        data: workingHoursData,
        skipDuplicates: true,
      });
    }
  }

  /**
   * Get business working hours (non-staff specific)
   */
  private async getBusinessWorkingHours(businessId: string) {
    return await this.prisma.workingHours.findMany({
      where: {
        businessId,
        staffId: null,
        isActive: true,
      },
      orderBy: { dayOfWeek: "asc" },
    });
  }

  /**
   * Copy business hours to a staff member
   */
  private async copyBusinessHoursToStaff(
    businessId: string,
    staffId: string,
    businessHours: any[]
  ) {
    const staffHoursData = businessHours.map((bh) => ({
      id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      businessId,
      staffId,
      dayOfWeek: bh.dayOfWeek,
      startTime: bh.startTime,
      endTime: bh.endTime,
      isActive: true,
      breaks: bh.breaks || undefined,
    }));

    if (staffHoursData.length > 0) {
      await this.prisma.workingHours.createMany({
        data: staffHoursData,
        skipDuplicates: true,
      });
    }
  }

  /**
   * Migrate existing business from JSON businessHours to WorkingHours table
   */
  async migrateBusinessFromJSON(businessId: string): Promise<void> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { businessHours: true },
    });

    if (!business?.businessHours) {
      logger.warn("Business has no JSON businessHours to migrate", {
        businessId,
      });
      return;
    }

    // Check if working hours already exist
    const existingHours = await this.prisma.workingHours.findFirst({
      where: {
        businessId,
        staffId: null,
      },
    });

    if (existingHours) {
      logger.info("Business already has working hours records", { businessId });
      return;
    }

    await this.createWorkingHoursFromJSON(
      businessId,
      business.businessHours as BusinessHoursJSON
    );
    logger.info("Migrated business from JSON to WorkingHours table", {
      businessId,
    });
  }

  /**
   * Get working hours for display (with proper day names)
   */
  async getWorkingHoursForDisplay(businessId: string, staffId?: string) {
    const hours = await this.prisma.workingHours.findMany({
      where: {
        businessId,
        staffId: staffId || null,
        isActive: true,
      },
      orderBy: { dayOfWeek: "asc" },
    });

    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    return hours.map((h) => ({
      ...h,
      dayName: dayNames[h.dayOfWeek],
      breaks: h.breaks ? JSON.parse(h.breaks as string) : [],
    }));
  }
}
