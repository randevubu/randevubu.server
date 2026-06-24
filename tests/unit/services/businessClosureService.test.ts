import { BusinessClosureService } from '../../../src/services/domain/closure/businessClosureService';
import { BusinessClosureRepository } from '../../../src/repositories/businessClosureRepository';
import { AppointmentRepository } from '../../../src/repositories/appointmentRepository';
import { RBACService } from '../../../src/services/domain/rbac/rbacService';
import { PermissionName } from '../../../src/types/auth';
import { AppError } from '../../../src/types/responseTypes';
import {
  BusinessClosureData,
  ClosureType,
} from '../../../src/types/business';
import { TEST_USER_IDS, TEST_BUSINESS_IDS } from '../../utils/testData';

import * as timezoneHelper from '../../../src/utils/timezoneHelper';

jest.mock('../../../src/utils/Logger/logger', () => ({
  __esModule: true,
  default: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

function makeClosure(overrides?: Partial<BusinessClosureData>): BusinessClosureData {
  return {
    id: 'closure-1',
    businessId: TEST_BUSINESS_IDS.ACTIVE,
    startDate: new Date('2026-07-01'),
    endDate: new Date('2026-07-05'),
    reason: 'Vacation',
    type: ClosureType.VACATION,
    isActive: true,
    createdBy: TEST_USER_IDS.BUSINESS_OWNER,
    createdAt: new Date(),
    updatedAt: new Date(),
    notifyCustomers: false,
    isRecurring: false,
    createdAppointmentsCount: 0,
    notifiedCustomersCount: 0,
    ...overrides,
  };
}

describe('BusinessClosureService', () => {
  let service: BusinessClosureService;
  let mockClosureRepo: jest.Mocked<BusinessClosureRepository>;
  let mockAppointmentRepo: jest.Mocked<AppointmentRepository>;
  let mockRBAC: jest.Mocked<RBACService>;

  const userId = TEST_USER_IDS.BUSINESS_OWNER;
  const businessId = TEST_BUSINESS_IDS.ACTIVE;

  beforeEach(() => {
    jest.spyOn(timezoneHelper, 'getCurrentTimeInIstanbul')
      .mockReturnValue(new Date('2026-06-24T12:00:00.000Z'));

    mockClosureRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByBusinessId: jest.fn(),
      findActiveByBusinessId: jest.fn(),
      findUpcomingByBusinessId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      isBusinessClosed: jest.fn(),
      findConflictingClosures: jest.fn(),
      extendClosure: jest.fn(),
      endClosureEarly: jest.fn(),
      findByDateRange: jest.fn(),
      findByType: jest.fn(),
      getClosureStats: jest.fn(),
      findRecurringHolidays: jest.fn(),
      autoExpireClosures: jest.fn(),
    } as any;

    mockAppointmentRepo = {
      findByBusinessAndDateRange: jest.fn().mockResolvedValue([]),
    } as any;

    mockRBAC = {
      hasPermission: jest.fn().mockResolvedValue(true),
      requirePermission: jest.fn().mockResolvedValue(undefined),
    } as any;

    service = new BusinessClosureService(mockClosureRepo, mockAppointmentRepo, mockRBAC);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // createClosure errors
  // =========================================================================
  describe('createClosure', () => {
    const validRequest = {
      startDate: '2026-07-01',
      endDate: '2026-07-05',
      reason: 'Summer break',
      type: ClosureType.VACATION,
    };

    it('should throw CLOSURE_START_IN_PAST when start date is in the past', async () => {
      const pastRequest = { ...validRequest, startDate: '2020-01-01' };

      await expect(service.createClosure(userId, businessId, pastRequest))
        .rejects.toThrow(AppError);

      try {
        await service.createClosure(userId, businessId, pastRequest);
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect((e as AppError).code).toBe('CLOSURE_START_IN_PAST');
      }
    });

    it('should throw CLOSURE_END_BEFORE_START when end date is before start date', async () => {
      const badRequest = {
        ...validRequest,
        startDate: '2026-07-10',
        endDate: '2026-07-05',
      };

      mockClosureRepo.findConflictingClosures.mockResolvedValue([]);

      await expect(service.createClosure(userId, businessId, badRequest))
        .rejects.toThrow(AppError);

      try {
        await service.createClosure(userId, businessId, badRequest);
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect((e as AppError).code).toBe('CLOSURE_END_BEFORE_START');
      }
    });

    it('should throw CLOSURE_CONFLICT when closure period conflicts with existing', async () => {
      mockClosureRepo.findConflictingClosures.mockResolvedValue([makeClosure()]);

      await expect(service.createClosure(userId, businessId, validRequest))
        .rejects.toThrow(AppError);

      try {
        await service.createClosure(userId, businessId, validRequest);
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect((e as AppError).code).toBe('CLOSURE_CONFLICT');
      }
    });

    it('should throw permission error when user lacks manage closure permission', async () => {
      mockRBAC.hasPermission.mockResolvedValue(false);
      mockRBAC.requirePermission.mockRejectedValue(
        new AppError('FORBIDDEN', { message: 'No permission' })
      );

      await expect(service.createClosure(userId, businessId, validRequest))
        .rejects.toThrow(AppError);

      expect(mockRBAC.requirePermission).toHaveBeenCalledWith(
        userId,
        PermissionName.MANAGE_OWN_CLOSURES,
        { businessId }
      );
    });

    it('should succeed with valid data and no conflicts', async () => {
      const expected = makeClosure();
      mockClosureRepo.findConflictingClosures.mockResolvedValue([]);
      mockClosureRepo.create.mockResolvedValue(expected);

      const result = await service.createClosure(userId, businessId, validRequest);

      expect(result).toEqual(expected);
      expect(mockClosureRepo.create).toHaveBeenCalledWith(businessId, userId, validRequest);
    });
  });

  // =========================================================================
  // updateClosure errors
  // =========================================================================
  describe('updateClosure', () => {
    const closureId = 'closure-1';

    it('should throw CLOSURE_NOT_FOUND when closure does not exist', async () => {
      mockClosureRepo.findById.mockResolvedValue(null);

      await expect(service.updateClosure(userId, closureId, { reason: 'new' }))
        .rejects.toThrow(AppError);

      try {
        await service.updateClosure(userId, closureId, { reason: 'new' });
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect((e as AppError).code).toBe('CLOSURE_NOT_FOUND');
      }
    });

    it('should throw CLOSURE_END_BEFORE_START when updated end date is before start date', async () => {
      mockClosureRepo.findById.mockResolvedValue(makeClosure({
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-07-05'),
      }));

      await expect(
        service.updateClosure(userId, closureId, {
          startDate: '2026-07-10',
          endDate: '2026-07-05',
        })
      ).rejects.toThrow(AppError);

      try {
        await service.updateClosure(userId, closureId, {
          startDate: '2026-07-10',
          endDate: '2026-07-05',
        });
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect((e as AppError).code).toBe('CLOSURE_END_BEFORE_START');
      }
    });

    it('should throw CLOSURE_END_BEFORE_START when end equals start on update', async () => {
      mockClosureRepo.findById.mockResolvedValue(makeClosure({
        startDate: new Date('2026-07-01'),
      }));

      await expect(
        service.updateClosure(userId, closureId, {
          endDate: '2026-07-01T00:00:00.000Z',
        })
      ).rejects.toThrow(AppError);

      try {
        await service.updateClosure(userId, closureId, {
          endDate: '2026-07-01T00:00:00.000Z',
        });
      } catch (e) {
        expect((e as AppError).code).toBe('CLOSURE_END_BEFORE_START');
      }
    });

    it('should throw CLOSURE_CONFLICT when updated dates conflict with existing closure', async () => {
      mockClosureRepo.findById.mockResolvedValue(makeClosure());
      mockClosureRepo.findConflictingClosures.mockResolvedValue([makeClosure({ id: 'other-closure' })]);

      await expect(
        service.updateClosure(userId, closureId, {
          startDate: '2026-07-01',
          endDate: '2026-07-10',
        })
      ).rejects.toThrow(AppError);

      try {
        await service.updateClosure(userId, closureId, {
          startDate: '2026-07-01',
          endDate: '2026-07-10',
        });
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect((e as AppError).code).toBe('CLOSURE_CONFLICT');
      }
    });

    it('should throw permission error when user lacks manage closure permission', async () => {
      mockClosureRepo.findById.mockResolvedValue(makeClosure());
      mockRBAC.hasPermission.mockResolvedValue(false);
      mockRBAC.requirePermission.mockRejectedValue(
        new AppError('FORBIDDEN', { message: 'No permission' })
      );

      await expect(service.updateClosure(userId, closureId, { reason: 'x' }))
        .rejects.toThrow(AppError);

      expect(mockRBAC.requirePermission).toHaveBeenCalledWith(
        userId,
        PermissionName.MANAGE_OWN_CLOSURES,
        { businessId }
      );
    });

    it('should succeed when updating with valid data', async () => {
      const existing = makeClosure();
      const updated = makeClosure({ reason: 'Updated reason' });
      mockClosureRepo.findById.mockResolvedValue(existing);
      mockClosureRepo.update.mockResolvedValue(updated);

      const result = await service.updateClosure(userId, closureId, { reason: 'Updated reason' });

      expect(result.reason).toBe('Updated reason');
    });
  });

  // =========================================================================
  // deleteClosure errors
  // =========================================================================
  describe('deleteClosure', () => {
    const closureId = 'closure-1';

    it('should throw CLOSURE_NOT_FOUND when closure does not exist', async () => {
      mockClosureRepo.findById.mockResolvedValue(null);

      await expect(service.deleteClosure(userId, closureId))
        .rejects.toThrow(AppError);

      try {
        await service.deleteClosure(userId, closureId);
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect((e as AppError).code).toBe('CLOSURE_NOT_FOUND');
      }
    });

    it('should throw permission error when user lacks manage closure permission', async () => {
      mockClosureRepo.findById.mockResolvedValue(makeClosure());
      mockRBAC.hasPermission.mockResolvedValue(false);
      mockRBAC.requirePermission.mockRejectedValue(
        new AppError('FORBIDDEN', { message: 'No permission' })
      );

      await expect(service.deleteClosure(userId, closureId))
        .rejects.toThrow(AppError);

      expect(mockRBAC.requirePermission).toHaveBeenCalledWith(
        userId,
        PermissionName.MANAGE_OWN_CLOSURES,
        { businessId }
      );
    });

    it('should succeed when closure exists and user has permission', async () => {
      mockClosureRepo.findById.mockResolvedValue(makeClosure());
      mockClosureRepo.delete.mockResolvedValue(undefined);

      await expect(service.deleteClosure(userId, closureId)).resolves.toBeUndefined();
      expect(mockClosureRepo.delete).toHaveBeenCalledWith(closureId);
    });
  });

  // =========================================================================
  // extendClosure errors
  // =========================================================================
  describe('extendClosure', () => {
    const closureId = 'closure-1';

    it('should throw CLOSURE_NOT_FOUND when closure does not exist', async () => {
      mockClosureRepo.findById.mockResolvedValue(null);

      await expect(service.extendClosure(userId, closureId, new Date('2026-07-15')))
        .rejects.toThrow(AppError);

      try {
        await service.extendClosure(userId, closureId, new Date('2026-07-15'));
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect((e as AppError).code).toBe('CLOSURE_NOT_FOUND');
      }
    });

    it('should throw CLOSURE_END_BEFORE_START when new end date is before start date', async () => {
      mockClosureRepo.findById.mockResolvedValue(makeClosure({
        startDate: new Date('2026-07-01'),
      }));

      await expect(
        service.extendClosure(userId, closureId, new Date('2026-06-25'))
      ).rejects.toThrow(AppError);

      try {
        await service.extendClosure(userId, closureId, new Date('2026-06-25'));
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect((e as AppError).code).toBe('CLOSURE_END_BEFORE_START');
      }
    });

    it('should throw CLOSURE_END_BEFORE_START when new end date equals start date', async () => {
      mockClosureRepo.findById.mockResolvedValue(makeClosure({
        startDate: new Date('2026-07-01'),
      }));

      await expect(
        service.extendClosure(userId, closureId, new Date('2026-07-01'))
      ).rejects.toThrow(AppError);

      try {
        await service.extendClosure(userId, closureId, new Date('2026-07-01'));
      } catch (e) {
        expect((e as AppError).code).toBe('CLOSURE_END_BEFORE_START');
      }
    });

    it('should throw CLOSURE_CONFLICT when extended period conflicts with another closure', async () => {
      mockClosureRepo.findById.mockResolvedValue(makeClosure());
      mockClosureRepo.findConflictingClosures.mockResolvedValue([makeClosure({ id: 'other' })]);

      await expect(
        service.extendClosure(userId, closureId, new Date('2026-07-20'))
      ).rejects.toThrow(AppError);

      try {
        await service.extendClosure(userId, closureId, new Date('2026-07-20'));
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect((e as AppError).code).toBe('CLOSURE_CONFLICT');
      }
    });

    it('should throw permission error when user lacks manage closure permission', async () => {
      mockClosureRepo.findById.mockResolvedValue(makeClosure());
      mockRBAC.hasPermission.mockResolvedValue(false);
      mockRBAC.requirePermission.mockRejectedValue(
        new AppError('FORBIDDEN', { message: 'No permission' })
      );

      await expect(service.extendClosure(userId, closureId, new Date('2026-07-20')))
        .rejects.toThrow(AppError);
    });

    it('should succeed when extending with valid data', async () => {
      const existing = makeClosure();
      const extended = makeClosure({ endDate: new Date('2026-07-20') });
      mockClosureRepo.findById.mockResolvedValue(existing);
      mockClosureRepo.findConflictingClosures.mockResolvedValue([]);
      mockClosureRepo.extendClosure.mockResolvedValue(extended);

      const result = await service.extendClosure(userId, closureId, new Date('2026-07-20'));

      expect(result.endDate).toEqual(new Date('2026-07-20'));
    });
  });

  // =========================================================================
  // endClosureEarly errors
  // =========================================================================
  describe('endClosureEarly', () => {
    const closureId = 'closure-1';

    it('should throw CLOSURE_NOT_FOUND when closure does not exist', async () => {
      mockClosureRepo.findById.mockResolvedValue(null);

      await expect(service.endClosureEarly(userId, closureId, new Date()))
        .rejects.toThrow(AppError);

      try {
        await service.endClosureEarly(userId, closureId, new Date());
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect((e as AppError).code).toBe('CLOSURE_NOT_FOUND');
      }
    });

    it('should throw CLOSURE_END_BEFORE_START when end date is before start date', async () => {
      mockClosureRepo.findById.mockResolvedValue(makeClosure({
        startDate: new Date('2026-07-01'),
      }));

      await expect(
        service.endClosureEarly(userId, closureId, new Date('2026-06-25'))
      ).rejects.toThrow(AppError);

      try {
        await service.endClosureEarly(userId, closureId, new Date('2026-06-25'));
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect((e as AppError).code).toBe('CLOSURE_END_BEFORE_START');
      }
    });

    it('should throw permission error when user lacks manage closure permission', async () => {
      mockClosureRepo.findById.mockResolvedValue(makeClosure());
      mockRBAC.hasPermission.mockResolvedValue(false);
      mockRBAC.requirePermission.mockRejectedValue(
        new AppError('FORBIDDEN', { message: 'No permission' })
      );

      await expect(service.endClosureEarly(userId, closureId, new Date('2026-07-03')))
        .rejects.toThrow(AppError);
    });

    it('should succeed when ending early with valid date', async () => {
      const existing = makeClosure();
      const ended = makeClosure({ endDate: new Date('2026-07-03') });
      mockClosureRepo.findById.mockResolvedValue(existing);
      mockClosureRepo.endClosureEarly.mockResolvedValue(ended);

      const result = await service.endClosureEarly(userId, closureId, new Date('2026-07-03'));

      expect(result.endDate).toEqual(new Date('2026-07-03'));
    });
  });

  // =========================================================================
  // View method permission errors
  // =========================================================================
  describe('getClosureById', () => {
    it('should return null when closure does not exist', async () => {
      mockClosureRepo.findById.mockResolvedValue(null);

      const result = await service.getClosureById(userId, 'nonexistent');

      expect(result).toBeNull();
    });

    it('should throw permission error when user lacks view permission', async () => {
      mockClosureRepo.findById.mockResolvedValue(makeClosure());
      mockRBAC.hasPermission.mockResolvedValue(false);
      mockRBAC.requirePermission.mockRejectedValue(
        new AppError('FORBIDDEN', { message: 'No permission' })
      );

      await expect(service.getClosureById(userId, 'closure-1'))
        .rejects.toThrow(AppError);

      expect(mockRBAC.requirePermission).toHaveBeenCalledWith(
        userId,
        PermissionName.VIEW_OWN_CLOSURES,
        { businessId }
      );
    });
  });

  describe('getBusinessClosures', () => {
    it('should throw permission error when user lacks view permission', async () => {
      mockRBAC.hasPermission.mockResolvedValue(false);
      mockRBAC.requirePermission.mockRejectedValue(
        new AppError('FORBIDDEN', { message: 'No permission' })
      );

      await expect(service.getBusinessClosures(userId, businessId))
        .rejects.toThrow(AppError);

      expect(mockRBAC.requirePermission).toHaveBeenCalledWith(
        userId,
        PermissionName.VIEW_OWN_CLOSURES,
        { businessId }
      );
    });
  });

  describe('getActiveClosures', () => {
    it('should throw permission error when user lacks view permission', async () => {
      mockRBAC.hasPermission.mockResolvedValue(false);
      mockRBAC.requirePermission.mockRejectedValue(
        new AppError('FORBIDDEN', { message: 'No permission' })
      );

      await expect(service.getActiveClosures(userId, businessId))
        .rejects.toThrow(AppError);
    });
  });

  describe('getUpcomingClosures', () => {
    it('should throw permission error when user lacks view permission', async () => {
      mockRBAC.hasPermission.mockResolvedValue(false);
      mockRBAC.requirePermission.mockRejectedValue(
        new AppError('FORBIDDEN', { message: 'No permission' })
      );

      await expect(service.getUpcomingClosures(userId, businessId))
        .rejects.toThrow(AppError);
    });
  });

  describe('getClosuresByDateRange', () => {
    it('should throw permission error when user lacks view permission', async () => {
      mockRBAC.hasPermission.mockResolvedValue(false);
      mockRBAC.requirePermission.mockRejectedValue(
        new AppError('FORBIDDEN', { message: 'No permission' })
      );

      await expect(
        service.getClosuresByDateRange(userId, businessId, new Date(), new Date())
      ).rejects.toThrow(AppError);
    });
  });

  describe('getClosuresByType', () => {
    it('should throw permission error when user lacks view permission', async () => {
      mockRBAC.hasPermission.mockResolvedValue(false);
      mockRBAC.requirePermission.mockRejectedValue(
        new AppError('FORBIDDEN', { message: 'No permission' })
      );

      await expect(
        service.getClosuresByType(userId, businessId, ClosureType.VACATION)
      ).rejects.toThrow(AppError);
    });
  });

  describe('getClosureStats', () => {
    it('should throw permission error when user lacks analytics permission', async () => {
      mockRBAC.hasPermission.mockResolvedValue(false);
      mockRBAC.requirePermission.mockRejectedValue(
        new AppError('FORBIDDEN', { message: 'No permission' })
      );

      await expect(service.getClosureStats(userId, businessId))
        .rejects.toThrow(AppError);

      expect(mockRBAC.requirePermission).toHaveBeenCalledWith(
        userId,
        PermissionName.VIEW_OWN_ANALYTICS,
        { businessId }
      );
    });
  });

  describe('getRecurringHolidays', () => {
    it('should throw permission error when user lacks view permission', async () => {
      mockRBAC.hasPermission.mockResolvedValue(false);
      mockRBAC.requirePermission.mockRejectedValue(
        new AppError('FORBIDDEN', { message: 'No permission' })
      );

      await expect(service.getRecurringHolidays(userId, businessId))
        .rejects.toThrow(AppError);
    });
  });

  describe('getAffectedAppointments', () => {
    it('should throw permission error when user lacks view appointment permission', async () => {
      mockRBAC.hasPermission.mockResolvedValue(false);
      mockRBAC.requirePermission.mockRejectedValue(
        new AppError('FORBIDDEN', { message: 'No permission' })
      );

      await expect(
        service.getAffectedAppointments(userId, businessId, new Date())
      ).rejects.toThrow(AppError);

      expect(mockRBAC.requirePermission).toHaveBeenCalledWith(
        userId,
        PermissionName.VIEW_OWN_APPOINTMENTS,
        { businessId }
      );
    });
  });

  describe('createRecurringHoliday', () => {
    it('should throw permission error when user lacks manage closure permission', async () => {
      mockRBAC.hasPermission.mockResolvedValue(false);
      mockRBAC.requirePermission.mockRejectedValue(
        new AppError('FORBIDDEN', { message: 'No permission' })
      );

      await expect(
        service.createRecurringHoliday(userId, businessId, 'New Year', new Date('2027-01-01'))
      ).rejects.toThrow(AppError);
    });
  });

  describe('createEmergencyClosure', () => {
    it('should throw permission error when user lacks manage closure permission', async () => {
      mockRBAC.hasPermission.mockResolvedValue(false);
      mockRBAC.requirePermission.mockRejectedValue(
        new AppError('FORBIDDEN', { message: 'No permission' })
      );

      await expect(
        service.createEmergencyClosure(userId, businessId, 'Flood')
      ).rejects.toThrow(AppError);
    });
  });

  describe('createMaintenanceClosure', () => {
    it('should throw permission error when user lacks manage closure permission', async () => {
      mockRBAC.hasPermission.mockResolvedValue(false);
      mockRBAC.requirePermission.mockRejectedValue(
        new AppError('FORBIDDEN', { message: 'No permission' })
      );

      await expect(
        service.createMaintenanceClosure(userId, businessId, 'Painting', new Date('2026-08-01'), 8)
      ).rejects.toThrow(AppError);
    });
  });

  describe('getClosuresCalendar', () => {
    it('should throw permission error when user lacks view permission', async () => {
      mockRBAC.hasPermission.mockResolvedValue(false);
      mockRBAC.requirePermission.mockRejectedValue(
        new AppError('FORBIDDEN', { message: 'No permission' })
      );

      await expect(service.getClosuresCalendar(userId, businessId, 2026))
        .rejects.toThrow(AppError);
    });
  });
});
