import { Request, Response, NextFunction } from 'express';
import { BusinessRepository } from '../repositories/businessRepository';
import { AppointmentRepository } from '../repositories/appointmentRepository';
import { PrismaClient, AppointmentStatus } from '@prisma/client';
import {
  ReservationSettings, 
  BusinessSettings, 
  ReservationValidationRequest as ReservationValidationRequestType,
  ReservationValidationResult,
  ReservationValidationError
} from '../types/reservationSettings';
import logger from "../utils/Logger/logger";
export interface ReservationValidationRequest extends Request {
  businessId?: string;
  date?: Date;
  customerId?: string;
}

export class ReservationValidationMiddleware {
  private businessRepository: BusinessRepository;
  private appointmentRepository: AppointmentRepository;

  constructor(prisma: PrismaClient) {
    this.businessRepository = new BusinessRepository(prisma);
    this.appointmentRepository = new AppointmentRepository(prisma);
  }

  /**
   * Middleware to validate reservation rules before appointment creation
   */
  validateReservationRules = async (req: ReservationValidationRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { businessId, date, customerId } = req.body;
      
      if (!businessId || !date) {
        res.status(400).json({
          success: false,
          error: 'Business ID and appointment date are required'
        });
        return;
      }

      // Get business reservation settings
      const business = await this.businessRepository.findById(businessId);
      if (!business) {
        res.status(404).json({
          success: false,
          error: 'Business not found'
        });
        return;
      }

      const settings = (business.settings as BusinessSettings) || {};
      const reservationSettings = settings.reservationSettings;

      // Use default values if settings not configured
      const rules: ReservationSettings = {
        maxAdvanceBookingDays: reservationSettings?.maxAdvanceBookingDays || 30,
        minNotificationHours: reservationSettings?.minNotificationHours || 2,
        maxDailyAppointments: reservationSettings?.maxDailyAppointments || 50
      };

      const dateTime = new Date(date);
      const now = new Date();

      // 1. Check maximum advance booking days
      const daysDifference = Math.ceil((dateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDifference > rules.maxAdvanceBookingDays) {
        res.status(400).json({
          success: false,
          error: `Appointments cannot be booked more than ${rules.maxAdvanceBookingDays} days in advance`,
          code: 'MAX_ADVANCE_BOOKING_EXCEEDED',
          details: {
            requestedDays: daysDifference,
            maxAllowed: rules.maxAdvanceBookingDays
          }
        });
        return;
      }

      // 2. Check minimum notification period
      const hoursDifference = (dateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursDifference < rules.minNotificationHours) {
        res.status(400).json({
          success: false,
          error: `Appointments must be booked at least ${rules.minNotificationHours} hours in advance`,
          code: 'MIN_NOTIFICATION_PERIOD_NOT_MET',
          details: {
            requestedHours: Math.round(hoursDifference * 100) / 100,
            minRequired: rules.minNotificationHours
          }
        });
        return;
      }

      // 3. Check maximum daily appointments
      const dateStart = new Date(dateTime);
      dateStart.setHours(0, 0, 0, 0);
      
      const dateEnd = new Date(dateTime);
      dateEnd.setHours(23, 59, 59, 999);

      const existingAppointmentsCount = await this.appointmentRepository.getAppointmentsCount({
        businessId,
        date: {
          gte: dateStart,
          lte: dateEnd
        },
        status: {
          not: AppointmentStatus.CANCELED
        }
      });

      if (existingAppointmentsCount >= rules.maxDailyAppointments) {
        res.status(400).json({
          success: false,
          error: `Maximum daily appointments (${rules.maxDailyAppointments}) has been reached for this date`,
          code: 'MAX_DAILY_APPOINTMENTS_EXCEEDED',
          details: {
            currentCount: existingAppointmentsCount,
            maxAllowed: rules.maxDailyAppointments,
            date: dateStart.toISOString().split('T')[0]
          }
        });
        return;
      }

      // Store validation results in request for potential use in controller
      req.businessId = businessId;
      req.date = dateTime;
      req.customerId = customerId;

      next();
    } catch (error) {
      logger.error('Reservation validation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate reservation rules',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Middleware to validate only advance booking rules (for updates)
   */
  validateAdvanceBooking = async (req: ReservationValidationRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { businessId, date } = req.body;
      
      if (!businessId || !date) {
        next();
        return;
      }

      const business = await this.businessRepository.findById(businessId);
      if (!business) {
        res.status(404).json({
          success: false,
          error: 'Business not found'
        });
        return;
      }

      const settings = (business.settings as BusinessSettings) || {};
      const reservationSettings = settings.reservationSettings;
      const maxAdvanceBookingDays = reservationSettings?.maxAdvanceBookingDays || 30;

      const dateTime = new Date(date);
      const now = new Date();
      const daysDifference = Math.ceil((dateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDifference > maxAdvanceBookingDays) {
        res.status(400).json({
          success: false,
          error: `Appointments cannot be booked more than ${maxAdvanceBookingDays} days in advance`,
          code: 'MAX_ADVANCE_BOOKING_EXCEEDED'
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Advance booking validation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate advance booking rules'
      });
    }
  };

  /**
   * Get business reservation settings for frontend display
   */
  getReservationSettings = async (businessId: string): Promise<ReservationSettings | null> => {
    try {
      const business = await this.businessRepository.findById(businessId);
      if (!business) {
        return null;
      }

      const settings = (business.settings as BusinessSettings) || {};
      const reservationSettings = settings.reservationSettings;

      return {
        maxAdvanceBookingDays: reservationSettings?.maxAdvanceBookingDays || 30,
        minNotificationHours: reservationSettings?.minNotificationHours || 2,
        maxDailyAppointments: reservationSettings?.maxDailyAppointments || 50
      };
    } catch (error) {
      logger.error('Error getting reservation settings:', error);
      return null;
    }
  };
}

/**
 * Factory function to create reservation validation middleware
 */
export const createReservationValidationMiddleware = (prisma: PrismaClient) => {
  const middleware = new ReservationValidationMiddleware(prisma);
  return {
    validateReservationRules: middleware.validateReservationRules,
    validateAdvanceBooking: middleware.validateAdvanceBooking,
    getReservationSettings: middleware.getReservationSettings.bind(middleware)
  };
};
