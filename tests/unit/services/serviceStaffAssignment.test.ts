/**
 * Tests for service-staff assignment feature:
 *   - STAFF creator: auto-assigned to the new service
 *   - OWNER/MANAGER with assignToAll=true: all active staff assigned
 *   - OWNER/MANAGER with assignToAll=false: no assignment (visible to all via fallback)
 *   - removeStaff: cleans up ServiceStaff records
 *   - getPublicBusinessStaff: filters by serviceId when assignments exist
 */

import { OfferingService } from '../../../src/services/domain/offering/offeringService';
import { StaffService } from '../../../src/services/domain/staff/staffService';

const USER_ID = 'user-001';
const BUSINESS_ID = 'biz-001';
const SERVICE_ID = 'svc-001';
const STAFF_RECORD_ID = 'bs-001';

function makeBaseService(): { id: string; businessId: string; name: string } {
  return { id: SERVICE_ID, businessId: BUSINESS_ID, name: 'Test Service' };
}

// --- OfferingService mocks ---

function makeOfferingMocks() {
  const mockServiceRepo = {
    create: jest.fn().mockResolvedValue(makeBaseService()),
    getBusinessStaffRecord: jest.fn().mockResolvedValue({ id: STAFF_RECORD_ID }),
    assignStaffToService: jest.fn().mockResolvedValue(undefined),
    assignAllStaffToService: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByBusinessId: jest.fn(),
    findActiveByBusinessId: jest.fn(),
    reorderServices: jest.fn(),
    getServiceStats: jest.fn(),
    bulkUpdatePrices: jest.fn(),
    findPopularServices: jest.fn(),
    checkServiceAvailability: jest.fn(),
    removeStaffFromAllServices: jest.fn(),
    getServiceStaffIds: jest.fn(),
    hasAnyStaffAssigned: jest.fn(),
  } as any;

  const mockBusinessRepo = {} as any;

  const mockRbac = {
    hasPermission: jest.fn().mockResolvedValue(false),
    requirePermission: jest.fn().mockResolvedValue(undefined),
    getUserPermissions: jest.fn(),
  } as any;

  const mockUsage = {
    canAddService: jest.fn().mockResolvedValue({ allowed: true }),
    updateServiceUsage: jest.fn().mockResolvedValue(undefined),
  } as any;

  const mockCache = {
    invalidateService: jest.fn().mockResolvedValue(undefined),
    invalidateBusiness: jest.fn().mockResolvedValue(undefined),
  } as any;

  const service = new OfferingService(
    mockServiceRepo,
    mockBusinessRepo,
    mockRbac,
    mockUsage,
    mockCache
  );

  return { service, mockServiceRepo, mockRbac };
}

describe('OfferingService.createService — staff assignment', () => {
  describe('when caller is STAFF (effectiveLevel=200)', () => {
    it('auto-assigns only that staff member to the new service', async () => {
      const { service, mockServiceRepo, mockRbac } = makeOfferingMocks();
      mockRbac.getUserPermissions.mockResolvedValue({ effectiveLevel: 200 });

      await service.createService(USER_ID, BUSINESS_ID, {
        name: 'Haircut',
        duration: 30,
        price: 100,
      });

      expect(mockServiceRepo.getBusinessStaffRecord).toHaveBeenCalledWith(USER_ID, BUSINESS_ID);
      expect(mockServiceRepo.assignStaffToService).toHaveBeenCalledWith(SERVICE_ID, STAFF_RECORD_ID);
      expect(mockServiceRepo.assignAllStaffToService).not.toHaveBeenCalled();
    });

    it('skips assignment if staff record not found', async () => {
      const { service, mockServiceRepo, mockRbac } = makeOfferingMocks();
      mockRbac.getUserPermissions.mockResolvedValue({ effectiveLevel: 200 });
      mockServiceRepo.getBusinessStaffRecord.mockResolvedValue(null);

      await service.createService(USER_ID, BUSINESS_ID, {
        name: 'Haircut',
        duration: 30,
        price: 100,
      });

      expect(mockServiceRepo.assignStaffToService).not.toHaveBeenCalled();
    });
  });

  describe('when caller is OWNER (effectiveLevel=300)', () => {
    it('assigns all staff when assignToAll=true', async () => {
      const { service, mockServiceRepo, mockRbac } = makeOfferingMocks();
      mockRbac.getUserPermissions.mockResolvedValue({ effectiveLevel: 300 });

      await service.createService(USER_ID, BUSINESS_ID, {
        name: 'Massage',
        duration: 60,
        price: 200,
        assignToAll: true,
      });

      expect(mockServiceRepo.assignAllStaffToService).toHaveBeenCalledWith(SERVICE_ID, BUSINESS_ID);
      expect(mockServiceRepo.assignStaffToService).not.toHaveBeenCalled();
    });

    it('makes no assignment when assignToAll=false (service visible to all via fallback)', async () => {
      const { service, mockServiceRepo, mockRbac } = makeOfferingMocks();
      mockRbac.getUserPermissions.mockResolvedValue({ effectiveLevel: 300 });

      await service.createService(USER_ID, BUSINESS_ID, {
        name: 'Massage',
        duration: 60,
        price: 200,
        assignToAll: false,
      });

      expect(mockServiceRepo.assignAllStaffToService).not.toHaveBeenCalled();
      expect(mockServiceRepo.assignStaffToService).not.toHaveBeenCalled();
    });

    it('makes no assignment when assignToAll is omitted', async () => {
      const { service, mockServiceRepo, mockRbac } = makeOfferingMocks();
      mockRbac.getUserPermissions.mockResolvedValue({ effectiveLevel: 300 });

      await service.createService(USER_ID, BUSINESS_ID, {
        name: 'Massage',
        duration: 60,
        price: 200,
      });

      expect(mockServiceRepo.assignAllStaffToService).not.toHaveBeenCalled();
      expect(mockServiceRepo.assignStaffToService).not.toHaveBeenCalled();
    });
  });

  describe('when caller is MANAGER (effectiveLevel=250)', () => {
    it('assigns all staff when assignToAll=true', async () => {
      const { service, mockServiceRepo, mockRbac } = makeOfferingMocks();
      mockRbac.getUserPermissions.mockResolvedValue({ effectiveLevel: 250 });

      await service.createService(USER_ID, BUSINESS_ID, {
        name: 'Styling',
        duration: 45,
        price: 150,
        assignToAll: true,
      });

      expect(mockServiceRepo.assignAllStaffToService).toHaveBeenCalledWith(SERVICE_ID, BUSINESS_ID);
    });
  });
});

// --- StaffService removeStaff cleanup mock ---

const OWNER_USER_ID = 'owner-user';

function makeStaffMocks() {
  const mockStaffRepo = {
    findById: jest.fn().mockResolvedValue({
      id: STAFF_RECORD_ID,
      userId: USER_ID,
      businessId: BUSINESS_ID,
      role: 'STAFF',
      isActive: true,
    }),
    deactivate: jest.fn().mockResolvedValue(undefined),
  } as any;

  const mockServiceRepo = {
    removeStaffFromAllServices: jest.fn().mockResolvedValue(undefined),
  } as any;

  const mockBusinessRepo = {
    // ownerId matches OWNER_USER_ID so no RBAC check needed
    findById: jest.fn().mockResolvedValue({ id: BUSINESS_ID, ownerId: OWNER_USER_ID }),
  } as any;

  const mockRbac = {
    hasPermission: jest.fn().mockResolvedValue(true),
    forceInvalidateUser: jest.fn(),
  } as any;

  const mockUsage = {
    updateStaffUsage: jest.fn().mockResolvedValue(undefined),
  } as any;

  const mockPhoneVerification = {} as any;

  const repositories = {
    staffRepository: mockStaffRepo,
    serviceRepository: mockServiceRepo,
    businessRepository: mockBusinessRepo,
    userRepository: {} as any,
  } as any;

  // StaffService(repositories, phoneVerificationService, rbacService, usageService)
  const staffSvc = new StaffService(
    repositories,
    mockPhoneVerification,
    mockRbac,
    mockUsage
  );

  return { staffSvc, mockStaffRepo, mockServiceRepo };
}

describe('StaffService.removeStaff — ServiceStaff cleanup', () => {
  it('deactivates ServiceStaff records for the removed staff member', async () => {
    const { staffSvc, mockServiceRepo } = makeStaffMocks();

    await staffSvc.removeStaff(OWNER_USER_ID, STAFF_RECORD_ID);

    expect(mockServiceRepo.removeStaffFromAllServices).toHaveBeenCalledWith(STAFF_RECORD_ID);
  });

  it('still deactivates the BusinessStaff record', async () => {
    const { staffSvc, mockStaffRepo } = makeStaffMocks();

    await staffSvc.removeStaff(OWNER_USER_ID, STAFF_RECORD_ID);

    expect(mockStaffRepo.deactivate).toHaveBeenCalledWith(STAFF_RECORD_ID);
  });
});

// --- getPublicBusinessStaff serviceId filtering ---

describe('StaffService.getPublicBusinessStaff — serviceId filter', () => {
  function makePublicStaffMocks() {
    const allStaff = [
      { id: 'bs-001', role: 'STAFF', user: { id: 'u1', firstName: 'Ali', lastName: 'Kurt', avatar: null } },
      { id: 'bs-002', role: 'OWNER', user: { id: 'u2', firstName: 'Ece', lastName: 'Yıldız', avatar: null } },
    ];

    const mockStaffRepo = {
      findByBusinessId: jest.fn().mockResolvedValue(allStaff),
      findByBusinessIdAndUserId: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    } as any;

    const mockServiceRepo = {
      getServiceStaffIds: jest.fn(),
    } as any;

    const mockBusinessRepo = {
      findByIdWithOwner: jest.fn().mockResolvedValue({
        id: BUSINESS_ID,
        owner: null,
        settings: {},
      }),
    } as any;

    const repositories = {
      staffRepository: mockStaffRepo,
      serviceRepository: mockServiceRepo,
      businessRepository: mockBusinessRepo,
      userRepository: {} as any,
    } as any;

    const staffSvc = new StaffService(
      repositories,
      {} as any,
      { requirePermission: jest.fn(), getUserPermissions: jest.fn(), forceInvalidateUser: jest.fn() } as any,
      {} as any
    );

    return { staffSvc, mockStaffRepo, mockServiceRepo };
  }

  it('returns all staff when no serviceId is provided', async () => {
    const { staffSvc, mockServiceRepo } = makePublicStaffMocks();

    const result = await staffSvc.getPublicBusinessStaff(BUSINESS_ID);

    expect(mockServiceRepo.getServiceStaffIds).not.toHaveBeenCalled();
    expect(result).toHaveLength(2);
  });

  it('filters staff to only assigned members when serviceId has assignments', async () => {
    const { staffSvc, mockServiceRepo } = makePublicStaffMocks();
    mockServiceRepo.getServiceStaffIds.mockResolvedValue(['bs-001']); // only first staff

    const result = await staffSvc.getPublicBusinessStaff(BUSINESS_ID, SERVICE_ID);

    expect(mockServiceRepo.getServiceStaffIds).toHaveBeenCalledWith(SERVICE_ID);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('bs-001');
  });

  it('returns all staff when serviceId has no assignments (backward compat)', async () => {
    const { staffSvc, mockServiceRepo } = makePublicStaffMocks();
    mockServiceRepo.getServiceStaffIds.mockResolvedValue([]); // no assignments

    const result = await staffSvc.getPublicBusinessStaff(BUSINESS_ID, SERVICE_ID);

    expect(result).toHaveLength(2);
  });
});
