import { AppointmentRescheduleService, RescheduleOptions, RescheduleResult, ClosureData } from '../../../src/services/appointmentRescheduleService';
import { NotificationService } from '../../../src/services/notificationService';
import { PrismaClient, AppointmentStatus } from '@prisma/client';
import { TestHelpers } from '../../utils/testHelpers';

// Mock dependencies
jest.mock('../../../src/services/notificationService');
jest.mock('@prisma/client');

describe('AppointmentRescheduleService', () => {
  let appointmentRescheduleService: AppointmentRescheduleService;
  let mockPrisma: any;
  let mockNotificationService: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock Prisma client
    mockPrisma = {
      businessClosure: {
        findUnique: jest.fn(),
        findMany: jest.fn()
      },
      appointment: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn()
      },
      workingHours: {
        findMany: jest.fn()
      },
      rescheduleSuggestion: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn()
      }
    };

    // Create mock notification service
    mockNotificationService = {
      sendRescheduleNotification: jest.fn()
    };

    // Create AppointmentRescheduleService instance
    appointmentRescheduleService = new AppointmentRescheduleService(
      mockPrisma as PrismaClient,
      mockNotificationService as NotificationService
    );
  });

  describe('constructor', () => {
    it('should create AppointmentRescheduleService instance', () => {
      expect(appointmentRescheduleService).toBeInstanceOf(AppointmentRescheduleService);
    });
  });

  describe('getAffectedAppointments', () => {
    it('should return affected appointments successfully', async () => {
      // Arrange
      const closureId = 'closure-123';
      const mockClosure = {
        id: closureId,
        businessId: 'business-123',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-17'),
        isActive: true
      };

      const mockAppointments = [
        {
          id: 'appointment-1',
          businessId: 'business-123',
          startTime: new Date('2024-01-16'),
          status: AppointmentStatus.CONFIRMED,
          customer: { id: 'customer-1' },
          service: { id: 'service-1' },
          staff: { id: 'staff-1' },
          business: { id: 'business-123' }
        }
      ];

      mockPrisma.businessClosure.findUnique.mockResolvedValue(mockClosure);
      mockPrisma.appointment.findMany.mockResolvedValue(mockAppointments);

      // Act
      const result = await appointmentRescheduleService.getAffectedAppointments(closureId);

      // Assert
      expect(result).toEqual(mockAppointments);
      expect(mockPrisma.businessClosure.findUnique).toHaveBeenCalledWith({
        where: { id: closureId }
      });
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith({
        where: {
          businessId: mockClosure.businessId,
          startTime: {
            gte: mockClosure.startDate,
            lte: mockClosure.endDate
          },
          status: AppointmentStatus.CONFIRMED
        },
        include: {
          customer: true,
          service: true,
          staff: true,
          business: true
        }
      });
    });

    it('should throw error when closure not found', async () => {
      // Arrange
      const closureId = 'closure-999';
      mockPrisma.businessClosure.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(appointmentRescheduleService.getAffectedAppointments(closureId))
        .rejects.toThrow('Closure not found');
    });

    it('should handle closure without end date', async () => {
      // Arrange
      const closureId = 'closure-123';
      const mockClosure = {
        id: closureId,
        businessId: 'business-123',
        startDate: new Date('2024-01-15'),
        endDate: null,
        isActive: true
      };

      mockPrisma.businessClosure.findUnique.mockResolvedValue(mockClosure);
      mockPrisma.appointment.findMany.mockResolvedValue([]);

      // Act
      const result = await appointmentRescheduleService.getAffectedAppointments(closureId);

      // Assert
      expect(result).toEqual([]);
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith({
        where: {
          businessId: mockClosure.businessId,
          startTime: {
            gte: mockClosure.startDate,
            lte: new Date('2099-12-31')
          },
          status: AppointmentStatus.CONFIRMED
        },
        include: {
          customer: true,
          service: true,
          staff: true,
          business: true
        }
      });
    });
  });

  describe('generateRescheduleSuggestions', () => {
    it('should generate reschedule suggestions successfully', async () => {
      // Arrange
      const appointmentId = 'appointment-123';
      const closureData: ClosureData = {
        id: 'closure-123',
        businessId: 'business-123',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-17'),
        type: 'MAINTENANCE',
        reason: 'Scheduled maintenance'
      };

      const mockAppointment = {
        id: appointmentId,
        businessId: 'business-123',
        serviceId: 'service-123',
        staffId: 'staff-123',
        duration: 60,
        startTime: new Date('2024-01-16T10:00:00Z'),
        service: { name: 'Haircut' },
        staff: { name: 'John Doe' },
        business: { name: 'Salon' },
        customer: { name: 'Jane Doe' }
      };

      const mockAvailableSlots = [
        {
          startTime: new Date('2024-01-18T10:00:00Z'),
          endTime: new Date('2024-01-18T11:00:00Z')
        },
        {
          startTime: new Date('2024-01-18T14:00:00Z'),
          endTime: new Date('2024-01-18T15:00:00Z')
        }
      ];

      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      mockPrisma.rescheduleSuggestion.create.mockResolvedValue({ id: 'suggestion-123' });

      // Mock the private method by spying on the service instance
      const findAvailableSlotsSpy = jest.spyOn(appointmentRescheduleService as any, 'findAvailableSlots')
        .mockResolvedValue(mockAvailableSlots);

      // Act
      const result = await appointmentRescheduleService.generateRescheduleSuggestions(appointmentId, closureData);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('originalAppointmentId', appointmentId);
      expect(result[0]).toHaveProperty('suggestedSlots', mockAvailableSlots);
      expect(result[0]).toHaveProperty('message');
      expect(mockPrisma.appointment.findUnique).toHaveBeenCalledWith({
        where: { id: appointmentId },
        include: {
          service: true,
          staff: true,
          business: true,
          customer: true
        }
      });
      expect(mockPrisma.rescheduleSuggestion.create).toHaveBeenCalled();
      expect(findAvailableSlotsSpy).toHaveBeenCalled();

      findAvailableSlotsSpy.mockRestore();
    });

    it('should throw error when appointment not found', async () => {
      // Arrange
      const appointmentId = 'appointment-999';
      const closureData: ClosureData = {
        id: 'closure-123',
        businessId: 'business-123',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-17'),
        type: 'MAINTENANCE',
        reason: 'Scheduled maintenance'
      };

      mockPrisma.appointment.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(appointmentRescheduleService.generateRescheduleSuggestions(appointmentId, closureData))
        .rejects.toThrow('Appointment not found');
    });
  });

  describe('autoRescheduleAppointments', () => {
    it('should auto-reschedule appointments successfully', async () => {
      // Arrange
      const closureId = 'closure-123';
      const rescheduleOptions: RescheduleOptions = {
        autoReschedule: true,
        maxRescheduleDays: 30,
        preferredTimeSlots: 'MORNING',
        notifyCustomers: true,
        allowWeekends: false
      };

      const mockClosure = {
        id: closureId,
        businessId: 'business-123',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-17'),
        type: 'MAINTENANCE',
        reason: 'Scheduled maintenance'
      };

      const mockAppointments = [
        {
          id: 'appointment-1',
          businessId: 'business-123',
          startTime: new Date('2024-01-16T10:00:00Z'),
          service: { name: 'Haircut' },
          staff: { name: 'John Doe' },
          business: { name: 'Salon' },
          customer: { name: 'Jane Doe' }
        }
      ];

      mockPrisma.businessClosure.findUnique.mockResolvedValue(mockClosure);
      mockPrisma.appointment.findMany.mockResolvedValue(mockAppointments);
      mockNotificationService.sendRescheduleNotification.mockResolvedValue(undefined);

      // Mock the private method
      const processAppointmentRescheduleSpy = jest.spyOn(appointmentRescheduleService as any, 'processAppointmentReschedule')
        .mockResolvedValue({
          appointmentId: 'appointment-1',
          originalDateTime: new Date('2024-01-16T10:00:00Z'),
          suggestedSlots: [],
          status: 'RESCHEDULED',
          newDateTime: new Date('2024-01-18T10:00:00Z'),
          customerNotified: true
        });

      // Act
      const result = await appointmentRescheduleService.autoRescheduleAppointments(closureId, rescheduleOptions);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('RESCHEDULED');
      expect(processAppointmentRescheduleSpy).toHaveBeenCalledWith(
        mockAppointments[0],
        mockClosure,
        rescheduleOptions
      );

      processAppointmentRescheduleSpy.mockRestore();
    });

    it('should handle errors in individual appointment processing', async () => {
      // Arrange
      const closureId = 'closure-123';
      const rescheduleOptions: RescheduleOptions = {
        autoReschedule: true,
        maxRescheduleDays: 30,
        preferredTimeSlots: 'MORNING',
        notifyCustomers: true,
        allowWeekends: false
      };

      const mockClosure = {
        id: closureId,
        businessId: 'business-123',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-17'),
        type: 'MAINTENANCE',
        reason: 'Scheduled maintenance'
      };

      const mockAppointments = [
        {
          id: 'appointment-1',
          businessId: 'business-123',
          startTime: new Date('2024-01-16T10:00:00Z')
        }
      ];

      mockPrisma.businessClosure.findUnique.mockResolvedValue(mockClosure);
      mockPrisma.appointment.findMany.mockResolvedValue(mockAppointments);

      // Mock the private method to throw an error
      const processAppointmentRescheduleSpy = jest.spyOn(appointmentRescheduleService as any, 'processAppointmentReschedule')
        .mockRejectedValue(new Error('Processing failed'));

      // Act
      const result = await appointmentRescheduleService.autoRescheduleAppointments(closureId, rescheduleOptions);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('FAILED');
      expect(result[0].error).toBe('Processing failed');
      expect(result[0].customerNotified).toBe(false);

      processAppointmentRescheduleSpy.mockRestore();
    });

    it('should throw error when closure not found', async () => {
      // Arrange
      const closureId = 'closure-999';
      const rescheduleOptions: RescheduleOptions = {
        autoReschedule: true,
        maxRescheduleDays: 30,
        preferredTimeSlots: 'MORNING',
        notifyCustomers: true,
        allowWeekends: false
      };

      mockPrisma.businessClosure.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(appointmentRescheduleService.autoRescheduleAppointments(closureId, rescheduleOptions))
        .rejects.toThrow('Closure not found');
    });
  });

  describe('findAvailableSlots', () => {
    it('should find available slots successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const serviceId = 'service-123';
      const staffId = 'staff-123';
      const duration = 60;
      const startDate = new Date('2024-01-18');
      const endDate = new Date('2024-01-25');

      const mockWorkingHours = [
        {
          dayOfWeek: 1, // Monday
          startTime: '09:00',
          endTime: '17:00',
          isActive: true
        }
      ];

      const mockExistingAppointments = [];
      const mockClosures = [];

      mockPrisma.workingHours.findMany.mockResolvedValue(mockWorkingHours);
      mockPrisma.appointment.findMany.mockResolvedValue(mockExistingAppointments);
      mockPrisma.businessClosure.findMany.mockResolvedValue(mockClosures);

      // Act
      const result = await appointmentRescheduleService.findAvailableSlots(
        businessId,
        serviceId,
        staffId,
        duration,
        startDate,
        endDate,
        'MORNING'
      );

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(mockPrisma.workingHours.findMany).toHaveBeenCalledWith({
        where: {
          businessId,
          staffId,
          isActive: true
        }
      });
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith({
        where: {
          businessId,
          staffId,
          startTime: {
            gte: startDate,
            lte: endDate
          },
          status: AppointmentStatus.CONFIRMED
        }
      });
    });

    it('should handle no working hours', async () => {
      // Arrange
      const businessId = 'business-123';
      const serviceId = 'service-123';
      const staffId = 'staff-123';
      const duration = 60;
      const startDate = new Date('2024-01-18');
      const endDate = new Date('2024-01-25');

      mockPrisma.workingHours.findMany.mockResolvedValue([]);
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      mockPrisma.businessClosure.findMany.mockResolvedValue([]);

      // Act
      const result = await appointmentRescheduleService.findAvailableSlots(
        businessId,
        serviceId,
        staffId,
        duration,
        startDate,
        endDate,
        'ANY'
      );

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('recordCustomerResponse', () => {
    it('should record customer acceptance successfully', async () => {
      // Arrange
      const suggestionId = 'suggestion-123';
      const customerId = 'customer-123';
      const response = 'ACCEPTED' as const;
      const selectedSlotIndex = 0;

      const mockSuggestion = {
        id: suggestionId,
        originalAppointmentId: 'appointment-123',
        suggestedDates: JSON.stringify([
          {
            startTime: new Date('2024-01-18T10:00:00Z'),
            endTime: new Date('2024-01-18T11:00:00Z')
          }
        ]),
        originalAppointment: {
          customerId: 'customer-123'
        }
      };

      mockPrisma.rescheduleSuggestion.findUnique.mockResolvedValue(mockSuggestion);
      mockPrisma.rescheduleSuggestion.update.mockResolvedValue({});
      mockPrisma.appointment.update.mockResolvedValue({});

      // Act
      await appointmentRescheduleService.recordCustomerResponse(
        suggestionId,
        customerId,
        response,
        selectedSlotIndex
      );

      // Assert
      expect(mockPrisma.rescheduleSuggestion.update).toHaveBeenCalledWith({
        where: { id: suggestionId },
        data: {
          customerResponse: response,
          responseAt: expect.any(Date)
        }
      });
      expect(mockPrisma.appointment.update).toHaveBeenCalledWith({
        where: { id: 'appointment-123' },
        data: {
          startTime: new Date('2024-01-18T10:00:00Z'),
          endTime: new Date('2024-01-18T11:00:00Z'),
          status: AppointmentStatus.CONFIRMED
        }
      });
    });

    it('should record customer decline successfully', async () => {
      // Arrange
      const suggestionId = 'suggestion-123';
      const customerId = 'customer-123';
      const response = 'DECLINED' as const;

      const mockSuggestion = {
        id: suggestionId,
        originalAppointmentId: 'appointment-123',
        suggestedDates: '[]',
        originalAppointment: {
          customerId: 'customer-123'
        }
      };

      mockPrisma.rescheduleSuggestion.findUnique.mockResolvedValue(mockSuggestion);
      mockPrisma.rescheduleSuggestion.update.mockResolvedValue({});
      mockPrisma.appointment.update.mockResolvedValue({});

      // Act
      await appointmentRescheduleService.recordCustomerResponse(
        suggestionId,
        customerId,
        response
      );

      // Assert
      expect(mockPrisma.rescheduleSuggestion.update).toHaveBeenCalledWith({
        where: { id: suggestionId },
        data: {
          customerResponse: response,
          responseAt: expect.any(Date)
        }
      });
      expect(mockPrisma.appointment.update).toHaveBeenCalledWith({
        where: { id: 'appointment-123' },
        data: {
          status: AppointmentStatus.CANCELED,
          cancelReason: 'Customer declined reschedule due to business closure',
          canceledAt: expect.any(Date)
        }
      });
    });

    it('should throw error when suggestion not found', async () => {
      // Arrange
      const suggestionId = 'suggestion-999';
      const customerId = 'customer-123';
      const response = 'ACCEPTED' as const;

      mockPrisma.rescheduleSuggestion.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(appointmentRescheduleService.recordCustomerResponse(
        suggestionId,
        customerId,
        response
      )).rejects.toThrow('Reschedule suggestion not found');
    });

    it('should throw error when customer is unauthorized', async () => {
      // Arrange
      const suggestionId = 'suggestion-123';
      const customerId = 'customer-999';
      const response = 'ACCEPTED' as const;

      const mockSuggestion = {
        id: suggestionId,
        originalAppointmentId: 'appointment-123',
        suggestedDates: '[]',
        originalAppointment: {
          customerId: 'customer-123'
        }
      };

      mockPrisma.rescheduleSuggestion.findUnique.mockResolvedValue(mockSuggestion);

      // Act & Assert
      await expect(appointmentRescheduleService.recordCustomerResponse(
        suggestionId,
        customerId,
        response
      )).rejects.toThrow('Unauthorized to respond to this suggestion');
    });
  });

  describe('getRescheduleStatistics', () => {
    it('should return reschedule statistics successfully', async () => {
      // Arrange
      const closureId = 'closure-123';
      const mockSuggestions = [
        {
          id: 'suggestion-1',
          customerResponse: 'ACCEPTED',
          originalAppointment: { id: 'appointment-1' }
        },
        {
          id: 'suggestion-2',
          customerResponse: 'DECLINED',
          originalAppointment: { id: 'appointment-2' }
        },
        {
          id: 'suggestion-3',
          customerResponse: null,
          originalAppointment: { id: 'appointment-3' }
        }
      ];

      mockPrisma.rescheduleSuggestion.findMany.mockResolvedValue(mockSuggestions);

      // Act
      const result = await appointmentRescheduleService.getRescheduleStatistics(closureId);

      // Assert
      expect(result).toEqual({
        totalAffected: 3,
        suggested: 3,
        rescheduled: 1,
        cancelled: 1,
        pending: 1
      });
      expect(mockPrisma.rescheduleSuggestion.findMany).toHaveBeenCalledWith({
        where: { closureId },
        include: {
          originalAppointment: true
        }
      });
    });

    it('should handle empty suggestions', async () => {
      // Arrange
      const closureId = 'closure-123';
      mockPrisma.rescheduleSuggestion.findMany.mockResolvedValue([]);

      // Act
      const result = await appointmentRescheduleService.getRescheduleStatistics(closureId);

      // Assert
      expect(result).toEqual({
        totalAffected: 0,
        suggested: 0,
        rescheduled: 0,
        cancelled: 0,
        pending: 0
      });
    });
  });

  describe('private methods', () => {
    describe('getPreferredTimeFromOriginal', () => {
      it('should return MORNING for early hours', () => {
        // Arrange
        const morningTime = new Date('2024-01-15T09:00:00Z');

        // Act
        const result = (appointmentRescheduleService as any).getPreferredTimeFromOriginal(morningTime);

        // Assert
        expect(result).toBe('MORNING');
      });

      it('should return AFTERNOON for midday hours', () => {
        // Arrange
        const afternoonTime = new Date('2024-01-15T14:00:00Z');

        // Act
        const result = (appointmentRescheduleService as any).getPreferredTimeFromOriginal(afternoonTime);

        // Assert
        expect(result).toBe('AFTERNOON');
      });

      it('should return EVENING for late hours', () => {
        // Arrange
        const eveningTime = new Date('2024-01-15T18:00:00Z');

        // Act
        const result = (appointmentRescheduleService as any).getPreferredTimeFromOriginal(eveningTime);

        // Assert
        expect(result).toBe('EVENING');
      });
    });

    describe('isTimeSlotConflicting', () => {
      it('should detect conflicting time slots', () => {
        // Arrange
        const slot = {
          startTime: new Date('2024-01-15T10:00:00Z'),
          endTime: new Date('2024-01-15T11:00:00Z')
        };
        const appointmentStart = new Date('2024-01-15T10:30:00Z');
        const appointmentEnd = new Date('2024-01-15T11:30:00Z');

        // Act
        const result = (appointmentRescheduleService as any).isTimeSlotConflicting(
          slot,
          appointmentStart,
          appointmentEnd
        );

        // Assert
        expect(result).toBe(true);
      });

      it('should detect non-conflicting time slots', () => {
        // Arrange
        const slot = {
          startTime: new Date('2024-01-15T10:00:00Z'),
          endTime: new Date('2024-01-15T11:00:00Z')
        };
        const appointmentStart = new Date('2024-01-15T12:00:00Z');
        const appointmentEnd = new Date('2024-01-15T13:00:00Z');

        // Act
        const result = (appointmentRescheduleService as any).isTimeSlotConflicting(
          slot,
          appointmentStart,
          appointmentEnd
        );

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('generateRescheduleMessage', () => {
      it('should generate appropriate reschedule message', () => {
        // Arrange
        const appointment = {
          startTime: new Date('2024-01-16T10:00:00Z'),
          service: { name: 'Haircut' },
          business: { name: 'Salon' }
        };
        const suggestedSlots = [
          {
            startTime: new Date('2024-01-18T10:00:00Z'),
            endTime: new Date('2024-01-18T11:00:00Z')
          }
        ];
        const closureData: ClosureData = {
          id: 'closure-123',
          businessId: 'business-123',
          startDate: new Date('2024-01-15'),
          endDate: new Date('2024-01-17'),
          type: 'MAINTENANCE',
          reason: 'Scheduled maintenance'
        };

        // Act
        const result = (appointmentRescheduleService as any).generateRescheduleMessage(
          appointment,
          suggestedSlots,
          closureData
        );

        // Assert
        expect(result).toContain('Salon');
        expect(result).toContain('Haircut');
        expect(result).toContain('Scheduled maintenance');
        expect(result).toContain('1 alternative times');
      });
    });
  });
});