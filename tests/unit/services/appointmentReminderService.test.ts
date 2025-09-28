import { AppointmentReminderService } from '../../../src/services/appointmentReminderService';
import { PrismaClient } from '@prisma/client';
import { NotificationService } from '../../../src/services/notificationService';
import { AppointmentService } from '../../../src/services/appointmentService';
import { BusinessService } from '../../../src/services/businessService';
import { AppointmentStatus, NotificationChannel } from '../../../src/types/business';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../../../src/services/notificationService');
jest.mock('../../../src/services/appointmentService');
jest.mock('../../../src/services/businessService');
jest.mock('node-cron');

describe('AppointmentReminderService', () => {
  let appointmentReminderService: AppointmentReminderService;
  let mockPrisma: any;
  let mockNotificationService: any;
  let mockAppointmentService: any;
  let mockBusinessService: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock Prisma client
    mockPrisma = {
      appointment: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn()
      }
    };

    // Create mock services
    mockNotificationService = {
      sendAppointmentReminder: jest.fn(),
      sendSmsNotification: jest.fn(),
      sendPushNotification: jest.fn()
    };

    mockAppointmentService = {
      markReminderSent: jest.fn(),
      getAppointmentsInRange: jest.fn()
    };

    mockBusinessService = {
      getBusinessById: jest.fn(),
      getBusinessNotificationSettings: jest.fn()
    };

    // Create AppointmentReminderService instance
    appointmentReminderService = new AppointmentReminderService(
      mockPrisma as PrismaClient,
      mockNotificationService,
      mockAppointmentService,
      mockBusinessService
    );
  });

  describe('constructor', () => {
    it('should create AppointmentReminderService instance', () => {
      expect(appointmentReminderService).toBeInstanceOf(AppointmentReminderService);
    });
  });

  describe('start', () => {
    it('should start the scheduler successfully', () => {
      // Act
      appointmentReminderService.start();

      // Assert
      // The actual cron job creation is mocked, so we just verify no errors are thrown
      expect(appointmentReminderService).toBeDefined();
    });

    it('should not start scheduler if already running', () => {
      // Arrange - start once
      appointmentReminderService.start();

      // Act - try to start again
      appointmentReminderService.start();

      // Assert - should not throw error
      expect(appointmentReminderService).toBeDefined();
    });
  });

  describe('stop', () => {
    it('should stop the scheduler successfully', () => {
      // Arrange - start first
      appointmentReminderService.start();

      // Act
      appointmentReminderService.stop();

      // Assert - should not throw error
      expect(appointmentReminderService).toBeDefined();
    });

    it('should handle stop when scheduler not running', () => {
      // Act
      appointmentReminderService.stop();

      // Assert - should not throw error
      expect(appointmentReminderService).toBeDefined();
    });
  });

  describe('checkRemindersNow', () => {
    it('should check reminders and return statistics', async () => {
      // Arrange
      const mockAppointments = [
        {
          id: 'appointment-1',
          startTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
          status: AppointmentStatus.CONFIRMED,
          reminderSent: false,
          service: { id: 'service-1', name: 'Haircut', duration: 60 },
          business: { id: 'business-1', name: 'Salon', timezone: 'Europe/Istanbul' },
          customer: { id: 'customer-1', firstName: 'John', lastName: 'Doe', phoneNumber: '+905551234567' }
        }
      ];

      mockPrisma.appointment.findMany.mockResolvedValue(mockAppointments);
      mockNotificationService.sendAppointmentReminder.mockResolvedValue([
        { success: true, channel: NotificationChannel.SMS },
        { success: true, channel: NotificationChannel.PUSH }
      ]);
      mockAppointmentService.markReminderSent.mockResolvedValue(undefined);

      // Act
      const result = await appointmentReminderService.checkRemindersNow();

      // Assert
      expect(result).toEqual({
        totalChecked: 1,
        remindersSent: 2,
        errors: 0,
        appointments: expect.arrayContaining([
          expect.objectContaining({
            id: 'appointment-1',
            reminderResults: expect.arrayContaining([
              expect.objectContaining({ success: true, channel: NotificationChannel.SMS }),
              expect.objectContaining({ success: true, channel: NotificationChannel.PUSH })
            ])
          })
        ])
      });
      expect(mockPrisma.appointment.findMany).toHaveBeenCalled();
      expect(mockNotificationService.sendAppointmentReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'appointment-1',
          service: expect.objectContaining({ name: 'Haircut' }),
          business: expect.objectContaining({ name: 'Salon' }),
          customer: expect.objectContaining({ firstName: 'John' })
        })
      );
      expect(mockAppointmentService.markReminderSent).toHaveBeenCalledWith('appointment-1');
    });

    it('should handle no appointments needing reminders', async () => {
      // Arrange
      mockPrisma.appointment.findMany.mockResolvedValue([]);

      // Act
      const result = await appointmentReminderService.checkRemindersNow();

      // Assert
      expect(result).toEqual({
        totalChecked: 0,
        remindersSent: 0,
        errors: 0,
        appointments: []
      });
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      mockPrisma.appointment.findMany.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await appointmentReminderService.checkRemindersNow();

      // Assert
      expect(result).toEqual({
        totalChecked: 0,
        remindersSent: 0,
        errors: 1,
        appointments: []
      });
    });
  });

  describe('getAppointmentsInRange', () => {
    it('should get appointments in specified range', async () => {
      // Arrange
      const startTime = new Date('2024-01-15T10:00:00Z');
      const endTime = new Date('2024-01-15T12:00:00Z');
      const businessId = 'business-123';

      const mockAppointments = [
        {
          id: 'appointment-1',
          startTime: new Date('2024-01-15T10:30:00Z'),
          status: AppointmentStatus.CONFIRMED,
          service: { name: 'Haircut' },
          business: { name: 'Salon' },
          customer: { firstName: 'John', lastName: 'Doe' }
        }
      ];

      mockAppointmentService.getAppointmentsInRange.mockResolvedValue(mockAppointments);

      // Act
      const result = await appointmentReminderService.getAppointmentsInRange(startTime, endTime, businessId);

      // Assert
      expect(result).toEqual(mockAppointments);
      expect(mockAppointmentService.getAppointmentsInRange).toHaveBeenCalledWith(startTime, endTime, businessId);
    });

    it('should get appointments without business filter', async () => {
      // Arrange
      const startTime = new Date('2024-01-15T10:00:00Z');
      const endTime = new Date('2024-01-15T12:00:00Z');

      const mockAppointments = [
        {
          id: 'appointment-1',
          startTime: new Date('2024-01-15T10:30:00Z'),
          status: AppointmentStatus.CONFIRMED
        }
      ];

      mockAppointmentService.getAppointmentsInRange.mockResolvedValue(mockAppointments);

      // Act
      const result = await appointmentReminderService.getAppointmentsInRange(startTime, endTime);

      // Assert
      expect(result).toEqual(mockAppointments);
      expect(mockAppointmentService.getAppointmentsInRange).toHaveBeenCalledWith(startTime, endTime, undefined);
    });
  });

  describe('isInBusinessQuietHours', () => {
    it('should return true when current time is in quiet hours', () => {
      // Arrange
      const currentTime = new Date('2024-01-15T22:00:00Z'); // 10 PM UTC
      const quietHours = { start: '22:00', end: '08:00' };
      const timezone = 'Europe/Istanbul';

      // Act
      const result = (appointmentReminderService as any).isInBusinessQuietHours(currentTime, quietHours, timezone);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when current time is not in quiet hours', () => {
      // Arrange
      const currentTime = new Date('2024-01-15T14:00:00Z'); // 2 PM UTC
      const quietHours = { start: '22:00', end: '08:00' };
      const timezone = 'Europe/Istanbul';

      // Act
      const result = (appointmentReminderService as any).isInBusinessQuietHours(currentTime, quietHours, timezone);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('isInQuietHours', () => {
    it('should return true when current time is in quiet hours', () => {
      // Arrange
      const currentTime = new Date('2024-01-15T22:00:00Z');
      const quietHours = { start: '22:00', end: '08:00', timezone: 'Europe/Istanbul' };
      const timezone = 'Europe/Istanbul';

      // Act
      const result = (appointmentReminderService as any).isInQuietHours(currentTime, quietHours, timezone);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when current time is not in quiet hours', () => {
      // Arrange
      const currentTime = new Date('2024-01-15T14:00:00Z');
      const quietHours = { start: '22:00', end: '08:00', timezone: 'Europe/Istanbul' };
      const timezone = 'Europe/Istanbul';

      // Act
      const result = (appointmentReminderService as any).isInQuietHours(currentTime, quietHours, timezone);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('timeStringToMinutes', () => {
    it('should convert time string to minutes correctly', () => {
      // Arrange
      const timeStr = '14:30';

      // Act
      const result = (appointmentReminderService as any).timeStringToMinutes(timeStr);

      // Assert
      expect(result).toBe(870); // 14 * 60 + 30 = 870 minutes
    });

    it('should handle midnight correctly', () => {
      // Arrange
      const timeStr = '00:00';

      // Act
      const result = (appointmentReminderService as any).timeStringToMinutes(timeStr);

      // Assert
      expect(result).toBe(0);
    });

    it('should handle end of day correctly', () => {
      // Arrange
      const timeStr = '23:59';

      // Act
      const result = (appointmentReminderService as any).timeStringToMinutes(timeStr);

      // Assert
      expect(result).toBe(1439); // 23 * 60 + 59 = 1439 minutes
    });
  });

  describe('processAppointmentReminders', () => {
    it('should process reminders successfully', async () => {
      // Arrange
      const mockAppointments = [
        {
          id: 'appointment-1',
          startTime: new Date(Date.now() + 60 * 60 * 1000),
          status: AppointmentStatus.CONFIRMED,
          reminderSent: false,
          service: { id: 'service-1', name: 'Haircut', duration: 60 },
          business: { id: 'business-1', name: 'Salon', timezone: 'Europe/Istanbul' },
          customer: { id: 'customer-1', firstName: 'John', lastName: 'Doe', phoneNumber: '+905551234567' }
        }
      ];

      mockPrisma.appointment.findMany.mockResolvedValue(mockAppointments);
      mockNotificationService.sendAppointmentReminder.mockResolvedValue([
        { success: true, channel: NotificationChannel.SMS }
      ]);
      mockAppointmentService.markReminderSent.mockResolvedValue(undefined);

      // Act
      await (appointmentReminderService as any).processAppointmentReminders();

      // Assert
      expect(mockPrisma.appointment.findMany).toHaveBeenCalled();
      expect(mockNotificationService.sendAppointmentReminder).toHaveBeenCalled();
      expect(mockAppointmentService.markReminderSent).toHaveBeenCalledWith('appointment-1');
    });

    it('should handle no appointments gracefully', async () => {
      // Arrange
      mockPrisma.appointment.findMany.mockResolvedValue([]);

      // Act
      await (appointmentReminderService as any).processAppointmentReminders();

      // Assert
      expect(mockPrisma.appointment.findMany).toHaveBeenCalled();
      expect(mockNotificationService.sendAppointmentReminder).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      mockPrisma.appointment.findMany.mockRejectedValue(new Error('Database error'));

      // Act
      await (appointmentReminderService as any).processAppointmentReminders();

      // Assert
      expect(mockPrisma.appointment.findMany).toHaveBeenCalled();
      // Should not throw error
    });
  });

  describe('getAppointmentsNeedingReminders', () => {
    it('should get appointments needing reminders', async () => {
      // Arrange
      const currentTime = new Date('2024-01-15T10:00:00Z');
      const mockAppointments = [
        {
          id: 'appointment-1',
          startTime: new Date('2024-01-15T11:00:00Z'),
          status: AppointmentStatus.CONFIRMED,
          reminderSent: false,
          service: { id: 'service-1', name: 'Haircut', duration: 60 },
          business: { id: 'business-1', name: 'Salon', timezone: 'Europe/Istanbul' },
          customer: { id: 'customer-1', firstName: 'John', lastName: 'Doe', phoneNumber: '+905551234567' }
        }
      ];

      mockPrisma.appointment.findMany.mockResolvedValue(mockAppointments);

      // Act
      const result = await (appointmentReminderService as any).getAppointmentsNeedingReminders(currentTime);

      // Assert
      expect(result).toEqual(mockAppointments);
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith({
        where: {
          startTime: {
            gte: expect.any(Date),
            lte: expect.any(Date)
          },
          status: AppointmentStatus.CONFIRMED,
          reminderSent: false
        },
        include: {
          service: {
            select: {
              id: true,
              name: true,
              duration: true
            }
          },
          business: {
            select: {
              id: true,
              name: true,
              timezone: true
            }
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true
            }
          }
        },
        orderBy: {
          startTime: 'asc'
        }
      });
    });
  });

  describe('sendAppointmentReminder', () => {
    it('should send reminder successfully', async () => {
      // Arrange
      const appointment = {
        id: 'appointment-1',
        startTime: new Date('2024-01-15T11:00:00Z'),
        service: { name: 'Haircut', duration: 60 },
        business: { name: 'Salon', timezone: 'Europe/Istanbul' },
        customer: { firstName: 'John', lastName: 'Doe', phoneNumber: '+905551234567' }
      };

      const mockResults = [
        { success: true, channel: NotificationChannel.SMS },
        { success: true, channel: NotificationChannel.PUSH }
      ];

      mockNotificationService.sendAppointmentReminder.mockResolvedValue(mockResults);

      // Act
      const result = await (appointmentReminderService as any).sendAppointmentReminder(appointment);

      // Assert
      expect(result).toEqual(mockResults);
      expect(mockNotificationService.sendAppointmentReminder).toHaveBeenCalledWith(appointment);
    });

    it('should handle notification service errors', async () => {
      // Arrange
      const appointment = {
        id: 'appointment-1',
        startTime: new Date('2024-01-15T11:00:00Z'),
        service: { name: 'Haircut', duration: 60 },
        business: { name: 'Salon', timezone: 'Europe/Istanbul' },
        customer: { firstName: 'John', lastName: 'Doe', phoneNumber: '+905551234567' }
      };

      mockNotificationService.sendAppointmentReminder.mockRejectedValue(new Error('Notification failed'));

      // Act & Assert
      await expect((appointmentReminderService as any).sendAppointmentReminder(appointment))
        .rejects.toThrow('Notification failed');
    });
  });
});

