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
import { createDateTimeInIstanbul, getCurrentTimeInIstanbul } from "../utils/timezoneHelper";
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
      const { businessId, date, startTime, customerId } = req.body;
      
      if (!businessId || !date || startTime === undefined || startTime === null || startTime === '') {
        const message = 'Business ID, date and start time are required';
        res.status(400).json({
          success: false,
          message,
          error: { code: 'VALIDATION_ERROR', key: 'errors.validation.general', message }
        });
        return;
      }

      // Get business reservation settings
      const business = await this.businessRepository.findById(businessId);
      if (!business) {
        const message = 'Business not found';
        res.status(404).json({
          success: false,
          message,
          error: { code: 'BUSINESS_NOT_FOUND', key: 'errors.business.notFound', message }
        });
        return;
      }

      const settings = (business.settings as BusinessSettings) || {};
      const reservationSettings = settings.reservationSettings;

      // Use default values if settings not configured
      const rules: ReservationSettings = {
        maxAdvanceBookingDays: reservationSettings?.maxAdvanceBookingDays || 30,
        minNotificationHours: reservationSettings?.minNotificationHours ?? 0,
        maxDailyAppointments: reservationSettings?.maxDailyAppointments || 50
      };

      // Use same Istanbul wall-clock semantics as AppointmentService (not Date-only UTC parse)
      const dateStr = typeof date === 'string' ? date.trim().slice(0, 10) : String(date);
      const timeStr = String(startTime).trim().slice(0, 5);
      const appointmentDateTime = createDateTimeInIstanbul(dateStr, timeStr);
      const now = getCurrentTimeInIstanbul();

      // 1. Check maximum advance booking days
      const daysDifference = Math.ceil((appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDifference > rules.maxAdvanceBookingDays) {
        const message = `Cannot book more than ${rules.maxAdvanceBookingDays} days in advance`;
        res.status(400).json({
          success: false,
          message,
          error: {
            code: 'MAX_ADVANCE_BOOKING_EXCEEDED',
            key: 'errors.appointment.tooFarFuture',
            message,
            params: { maxDays: rules.maxAdvanceBookingDays },
            details: {
              requestedDays: daysDifference,
              maxAllowed: rules.maxAdvanceBookingDays
            }
          }
        });
        return;
      }

      // 2. Check minimum notification period
      const hoursDifference = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursDifference < rules.minNotificationHours) {
        const message = `Appointment must be booked at least ${rules.minNotificationHours} hours in advance`;
        res.status(400).json({
          success: false,
          message,
          error: {
            code: 'MIN_NOTIFICATION_PERIOD_NOT_MET',
            key: 'errors.appointment.insufficientAdvance',
            message,
            params: { minHours: rules.minNotificationHours },
            details: {
              requestedHours: Math.round(hoursDifference * 100) / 100,
              minRequired: rules.minNotificationHours
            }
          }
        });
        return;
      }

      // 3. Check maximum daily appointments
      const dateStart = new Date(appointmentDateTime);
      dateStart.setHours(0, 0, 0, 0);

      const dateEnd = new Date(appointmentDateTime);
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
        const message = `Daily appointment limit (${rules.maxDailyAppointments}) reached for this date`;
        res.status(409).json({
          success: false,
          message,
          error: {
            code: 'MAX_DAILY_APPOINTMENTS_EXCEEDED',
            key: 'errors.appointment.dailyLimitReached',
            message,
            params: { maxDaily: rules.maxDailyAppointments },
            details: {
              currentCount: existingAppointmentsCount,
              maxAllowed: rules.maxDailyAppointments,
              date: dateStart.toISOString().split('T')[0]
            }
          }
        });
        return;
      }

      // Store validation results in request for potential use in controller
      req.businessId = businessId;
      req.date = appointmentDateTime;
      req.customerId = customerId;

      next();
    } catch (error) {
      logger.error('Reservation validation error:', error);
      const message = 'Failed to validate reservation rules';
      res.status(500).json({
        success: false,
        message,
        error: { code: 'INTERNAL_SERVER_ERROR', key: 'errors.system.internalError', message, details: error instanceof Error ? error.message : 'Unknown error' }
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
        const message = 'Business not found';
        res.status(404).json({
          success: false,
          message,
          error: { code: 'BUSINESS_NOT_FOUND', key: 'errors.business.notFound', message }
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
        const message = `Cannot book more than ${maxAdvanceBookingDays} days in advance`;
        res.status(400).json({
          success: false,
          message,
          error: { code: 'MAX_ADVANCE_BOOKING_EXCEEDED', key: 'errors.appointment.tooFarFuture', message, params: { maxDays: maxAdvanceBookingDays } }
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Advance booking validation error:', error);
      const message = 'Failed to validate reservation rules';
      res.status(500).json({
        success: false,
        message,
        error: { code: 'INTERNAL_SERVER_ERROR', key: 'errors.system.internalError', message }
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
        minNotificationHours: reservationSettings?.minNotificationHours ?? 0,
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
