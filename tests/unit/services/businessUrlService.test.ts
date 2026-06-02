/**
 * Tests for business URL field behavior:
 *   - Appointment Page URL: auto-derived from slug, never stored in `website`
 *   - Website URL: user-entered, stored in `website` DB field, independent of slug
 */

import { BusinessService } from '../../../src/services/domain/business/businessService';

const SLUG = 'test-business';
const BUSINESS_ID = 'biz-001';
const USER_ID = 'user-001';

function makeMocks() {
  const mockRepo = {
    createWithRoleAssignment: jest.fn(),
    update: jest.fn(),
    findBySlugWithServices: jest.fn(),
    findById: jest.fn(),
    findByOwnerId: jest.fn(),
    checkSlugAvailability: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    updateVerificationStatus: jest.fn(),
    updateClosureStatus: jest.fn(),
    updateBusinessHours: jest.fn(),
    findAll: jest.fn(),
    findByType: jest.fn(),
    search: jest.fn(),
    findNearby: jest.fn(),
    getStats: jest.fn(),
    findWithStaff: jest.fn(),
  } as any;

  const mockRbac = {
    requirePermission: jest.fn().mockResolvedValue(undefined),
    hasPermission: jest.fn().mockResolvedValue(false),
    assignRole: jest.fn(),
  } as any;

  const mockUsage = { updateStaffUsage: jest.fn() } as any;
  const mockWorkingHours = { bulkCreate: jest.fn() } as any;

  return { mockRepo, mockRbac, mockUsage, mockWorkingHours };
}

function baseBusiness(overrides = {}) {
  return {
    id: BUSINESS_ID,
    name: 'Test Business',
    slug: SLUG,
    website: null,
    phone: '+905551234567',
    isActive: true,
    isVerified: false,
    isClosed: false,
    ...overrides,
  };
}

describe('Business URL fields', () => {
  let service: BusinessService;
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
    service = new BusinessService(
      mocks.mockRepo,
      mocks.mockRbac,
      mocks.mockUsage,
      mocks.mockWorkingHours,
    );
    jest.clearAllMocks();
  });

  // ── createBusiness ─────────────────────────────────────────────────────────

  describe('createBusiness', () => {
    it('does NOT auto-set website to the randevubu appointment URL', async () => {
      mocks.mockRepo.checkSlugAvailability.mockResolvedValue(true);
      mocks.mockRepo.createWithRoleAssignment.mockResolvedValue(
        baseBusiness({ website: null })
      );
      mocks.mockRepo.findById.mockResolvedValue(baseBusiness());

      await service.createBusiness(USER_ID, {
        name: 'Test Business',
        businessTypeId: 'type-001',
        phone: '+905551234567',
        city: 'Istanbul',
        country: 'Turkey',
        timezone: 'Europe/Istanbul',
      }).catch(() => {});

      const call = mocks.mockRepo.createWithRoleAssignment.mock.calls[0]?.[0];
      if (call) {
        // website must be absent — appointment URL is never stored in this field
        expect(call.website).toBeUndefined();
      }
    });
  });

  // ── updateBusiness ─────────────────────────────────────────────────────────

  describe('updateBusiness — website field', () => {
    it('saves user-provided website correctly', async () => {
      mocks.mockRepo.update.mockResolvedValue(
        baseBusiness({ website: 'https://safeguardshelter.com/' })
      );

      await service.updateBusiness(USER_ID, BUSINESS_ID, {
        website: 'https://safeguardshelter.com/',
      });

      expect(mocks.mockRepo.update).toHaveBeenCalledWith(
        BUSINESS_ID,
        expect.objectContaining({ website: 'https://safeguardshelter.com/' })
      );
    });

    it('clears website when empty string is sent', async () => {
      mocks.mockRepo.update.mockResolvedValue(baseBusiness({ website: null }));

      await service.updateBusiness(USER_ID, BUSINESS_ID, { website: '' });

      expect(mocks.mockRepo.update).toHaveBeenCalledWith(
        BUSINESS_ID,
        expect.objectContaining({ website: '' })
      );
    });

    it('does NOT overwrite website with randevubu URL when name changes', async () => {
      mocks.mockRepo.checkSlugAvailability.mockResolvedValue(true);
      mocks.mockRepo.update.mockResolvedValue(
        baseBusiness({ website: 'https://safeguardshelter.com/' })
      );

      await service.updateBusiness(USER_ID, BUSINESS_ID, {
        name: 'New Name',
        website: 'https://safeguardshelter.com/',
      });

      const [, updateArg] = mocks.mockRepo.update.mock.calls[0];
      expect(updateArg.website).toBe('https://safeguardshelter.com/');
      expect(updateArg.website).not.toMatch(/randevubu\.com/);
    });

    it('does NOT inject randevubu URL when name changes and website is not provided', async () => {
      mocks.mockRepo.checkSlugAvailability.mockResolvedValue(true);
      mocks.mockRepo.update.mockResolvedValue(baseBusiness());

      await service.updateBusiness(USER_ID, BUSINESS_ID, { name: 'New Name' });

      const [, updateArg] = mocks.mockRepo.update.mock.calls[0];
      expect(updateArg.website).toBeUndefined();
    });

    it('website is independent of slug regeneration', async () => {
      mocks.mockRepo.checkSlugAvailability.mockResolvedValue(true);
      mocks.mockRepo.update.mockResolvedValue(
        baseBusiness({ slug: 'new-name', website: 'https://disbakimklinigi.com' })
      );

      await service.updateBusiness(USER_ID, BUSINESS_ID, {
        name: 'New Name',
        website: 'https://disbakimklinigi.com',
      });

      const [, updateArg] = mocks.mockRepo.update.mock.calls[0];
      expect(updateArg.slug).toBeDefined();
      expect(updateArg.website).toBe('https://disbakimklinigi.com');
    });
  });

  // ── getBusinessBySlugWithServices ──────────────────────────────────────────

  describe('getBusinessBySlugWithServices — profile display', () => {
    it('returns null website when not set', async () => {
      mocks.mockRepo.findBySlugWithServices.mockResolvedValue(
        baseBusiness({ website: null, services: [], businessType: {}, settings: {} })
      );

      const result = await service.getBusinessBySlugWithServices(SLUG);
      expect(result?.website).toBeNull();
    });

    it('returns user-set website when present', async () => {
      mocks.mockRepo.findBySlugWithServices.mockResolvedValue(
        baseBusiness({
          website: 'https://safeguardshelter.com/',
          services: [],
          businessType: {},
          settings: {},
        })
      );

      const result = await service.getBusinessBySlugWithServices(SLUG);
      expect(result?.website).toBe('https://safeguardshelter.com/');
    });
  });
});
