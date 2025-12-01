import { StartupService } from '../../../src/services/core/startupService';
import { PrismaClient } from '@prisma/client';
import logger from '../../../src/utils/Logger/logger';

// Mock logger
jest.mock('../../../src/utils/Logger/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('StartupService', () => {
  let startupService: StartupService;
  let mockPrisma: any;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    // Save original NODE_ENV
    originalNodeEnv = process.env.NODE_ENV;

    // Create mock Prisma client following existing test patterns
    mockPrisma = {
      $connect: jest.fn(),
      role: {
        findUnique: jest.fn(),
        createMany: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      subscriptionPlan: {
        count: jest.fn(),
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
      userRole: {
        create: jest.fn(),
      },
    };

    startupService = new StartupService(mockPrisma as PrismaClient);
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original NODE_ENV
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
    jest.clearAllMocks();
  });

  describe('ensureEssentialData', () => {
    it('should skip execution in non-production environments', async () => {
      // Arrange
      process.env.NODE_ENV = 'development';

      // Act
      await startupService.ensureEssentialData();

      // Assert
      expect(logger.info).toHaveBeenCalledWith('⏭️  Skipping database seeding - not in production mode');
      expect(mockPrisma.$connect).not.toHaveBeenCalled();
    });

    it('should execute in production environment', async () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      mockPrisma.$connect.mockResolvedValue(undefined);
      mockPrisma.role.findUnique.mockResolvedValue({ name: 'CUSTOMER' }); // Role exists
      mockPrisma.role.findMany.mockResolvedValue([{ name: 'CUSTOMER', isActive: true }]); // Log existing roles
      mockPrisma.role.count.mockResolvedValue(4);
      mockPrisma.subscriptionPlan.count.mockResolvedValue(6);
      mockPrisma.subscriptionPlan.findMany.mockResolvedValue([
        { name: 'basic_tier1', displayName: 'Basic Plan', price: 949.00 },
      ]); // Log existing plans
      mockPrisma.user.findMany.mockResolvedValue([]);

      // Act
      await startupService.ensureEssentialData();

      // Assert
      expect(logger.info).not.toHaveBeenCalledWith('⏭️  Skipping database seeding - not in production mode');
      expect(mockPrisma.$connect).toHaveBeenCalled();
    });

    it('should create roles when CUSTOMER role is missing', async () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      mockPrisma.$connect.mockResolvedValue(undefined);
      mockPrisma.role.findUnique.mockResolvedValue(null);
      mockPrisma.role.createMany.mockResolvedValue({ count: 4 });
      mockPrisma.role.count.mockResolvedValue(4);
      mockPrisma.subscriptionPlan.count.mockResolvedValue(6);
      mockPrisma.user.findMany.mockResolvedValue([]);

      // Act
      await startupService.ensureEssentialData();

      // Assert - Verify the actual data structure and values
      expect(mockPrisma.role.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            name: 'CUSTOMER',
            displayName: 'Customer',
            level: 100,
            isSystem: true,
            isActive: true,
            description: 'Customer - can book appointments and view business information',
          }),
          expect.objectContaining({
            name: 'OWNER',
            displayName: 'Business Owner',
            level: 300,
            isSystem: true,
            isActive: true,
          }),
          expect.objectContaining({
            name: 'STAFF',
            displayName: 'Business Staff',
            level: 200,
            isSystem: true,
            isActive: true,
          }),
          expect.objectContaining({
            name: 'ADMIN',
            displayName: 'Platform Administrator',
            level: 1000,
            isSystem: true,
            isActive: true,
          }),
        ]),
        skipDuplicates: true,
      });

      // Verify all 4 roles are created
      const createManyCall = mockPrisma.role.createMany.mock.calls[0][0];
      expect(createManyCall.data).toHaveLength(4);
    });

    it('should create subscription plans when count is less than 6', async () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      mockPrisma.$connect.mockResolvedValue(undefined);
      mockPrisma.role.findUnique.mockResolvedValue({ name: 'CUSTOMER' }); // Role exists
      mockPrisma.role.findMany.mockResolvedValue([{ name: 'CUSTOMER', isActive: true }]); // Log existing roles
      mockPrisma.role.count.mockResolvedValue(4);
      // Count is called twice: once to check (< 6), once after creation to verify
      mockPrisma.subscriptionPlan.count
        .mockResolvedValueOnce(2) // Initial count - less than 6
        .mockResolvedValueOnce(8); // Final count after creation
      mockPrisma.subscriptionPlan.upsert.mockResolvedValue({});
      mockPrisma.user.findMany.mockResolvedValue([]);

      // Act
      await startupService.ensureEssentialData();

      // Assert - Should attempt to create 6 plans
      expect(mockPrisma.subscriptionPlan.upsert).toHaveBeenCalledTimes(6);

      // Verify actual plan data structure - check first plan (basic_tier1)
      const firstUpsertCall = mockPrisma.subscriptionPlan.upsert.mock.calls[0][0];
      expect(firstUpsertCall.where.name).toBe('basic_tier1');
      expect(firstUpsertCall.create).toMatchObject({
        id: 'plan_basic_tier1',
        name: 'basic_tier1',
        displayName: 'Basic Plan',
        price: 949.00,
        currency: 'TRY',
        billingInterval: 'MONTHLY',
        maxBusinesses: 1,
        maxStaffPerBusiness: 1,
        features: expect.objectContaining({
          pricingTier: 'TIER_1',
          appointmentBooking: true,
          smsQuota: 1000,
        }),
        isActive: true,
        sortOrder: 1,
      });

      // Verify premium plan structure
      const secondUpsertCall = mockPrisma.subscriptionPlan.upsert.mock.calls[1][0];
      expect(secondUpsertCall.where.name).toBe('premium_tier1');
      expect(secondUpsertCall.create).toMatchObject({
        name: 'premium_tier1',
        price: 1499.00,
        maxStaffPerBusiness: 5,
        features: expect.objectContaining({
          pricingTier: 'TIER_1',
          customBranding: true,
          advancedReports: true,
          apiAccess: true,
        }),
        isPopular: true,
      });

      // Verify all 6 plans are created (basic/premium for each tier)
      const planNames = mockPrisma.subscriptionPlan.upsert.mock.calls.map((call: any) => call[0].where.name);
      expect(planNames).toEqual([
        'basic_tier1',
        'premium_tier1',
        'basic_tier2',
        'premium_tier2',
        'basic_tier3',
        'premium_tier3',
      ]);
    });

    it('should not create subscription plans when 6 or more exist', async () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      mockPrisma.$connect.mockResolvedValue(undefined);
      mockPrisma.role.findUnique.mockResolvedValue({ name: 'CUSTOMER' }); // Role exists
      mockPrisma.role.findMany.mockResolvedValue([{ name: 'CUSTOMER', isActive: true }]); // Log existing roles
      mockPrisma.role.count.mockResolvedValue(4);
      mockPrisma.subscriptionPlan.count.mockResolvedValue(6);
      mockPrisma.subscriptionPlan.findMany.mockResolvedValue([
        { name: 'basic_tier1', displayName: 'Basic Plan', price: 949.00 },
        { name: 'premium_tier1', displayName: 'Premium Plan', price: 1499.00 },
      ]); // Log existing plans
      mockPrisma.user.findMany.mockResolvedValue([]);

      // Act
      await startupService.ensureEssentialData();

      // Assert
      expect(mockPrisma.subscriptionPlan.upsert).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('✅ All subscription plans already exist');
    });

    it('should assign CUSTOMER role to users without roles', async () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const mockCustomerRole = { id: 'role-customer-123', name: 'CUSTOMER' };
      const mockUsers = [
        { id: 'user-1', phoneNumber: '+9055512345678' },
        { id: 'user-2', phoneNumber: '+9055598765432' },
      ];

      mockPrisma.$connect.mockResolvedValue(undefined);
      mockPrisma.role.findUnique
        .mockResolvedValueOnce(mockCustomerRole) // First call for role check
        .mockResolvedValueOnce(mockCustomerRole); // Second call for user role assignment
      mockPrisma.role.findMany.mockResolvedValue([{ name: 'CUSTOMER', isActive: true }]); // Log existing roles
      mockPrisma.role.count.mockResolvedValue(4);
      mockPrisma.subscriptionPlan.count.mockResolvedValue(6);
      mockPrisma.subscriptionPlan.findMany.mockResolvedValue([
        { name: 'basic_tier1', displayName: 'Basic Plan', price: 949.00 },
      ]); // Log existing plans
      mockPrisma.user.findMany
        .mockResolvedValueOnce(mockUsers); // Users without roles
      mockPrisma.userRole.create.mockResolvedValue({});

      // Act
      await startupService.ensureEssentialData();

      // Assert - Verify both users get roles assigned
      expect(mockPrisma.userRole.create).toHaveBeenCalledTimes(2);
      
      // Verify first user role assignment with actual data structure
      expect(mockPrisma.userRole.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          roleId: 'role-customer-123',
          grantedBy: 'user-1', // Self-assigned
          isActive: true,
        }),
      });

      // Verify second user role assignment
      expect(mockPrisma.userRole.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-2',
          roleId: 'role-customer-123',
          grantedBy: 'user-2',
          isActive: true,
        }),
      });

      // Verify the ID format matches the pattern
      const firstCall = mockPrisma.userRole.create.mock.calls[0][0];
      expect(firstCall.data.id).toMatch(/^user_role_user-1_\d+$/);
      expect(firstCall.data.grantedAt).toBeInstanceOf(Date);
    });

    it('should handle errors gracefully without throwing', async () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const testError = new Error('Database connection failed');
      mockPrisma.$connect.mockRejectedValue(testError);

      // Act & Assert - Should not throw
      await expect(startupService.ensureEssentialData()).resolves.not.toThrow();

      expect(logger.error).toHaveBeenCalledWith('❌ Failed to ensure essential data:', testError);
    });

    it('should handle subscription plan creation errors gracefully', async () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      mockPrisma.$connect.mockResolvedValue(undefined);
      mockPrisma.role.findUnique.mockResolvedValue({ name: 'CUSTOMER' }); // Role exists
      mockPrisma.role.findMany.mockResolvedValue([{ name: 'CUSTOMER', isActive: true }]); // Log existing roles
      mockPrisma.role.count.mockResolvedValue(4);
      // Count is called twice: once to check (< 6), once after creation to verify
      mockPrisma.subscriptionPlan.count
        .mockResolvedValueOnce(2) // Initial count - less than 6
        .mockResolvedValueOnce(7); // Final count after creation (some may have failed)
      // First upsert fails, rest succeed
      mockPrisma.subscriptionPlan.upsert
        .mockRejectedValueOnce(new Error('Plan creation failed'))
        .mockResolvedValue({})
        .mockResolvedValue({})
        .mockResolvedValue({})
        .mockResolvedValue({})
        .mockResolvedValue({});
      mockPrisma.user.findMany.mockResolvedValue([]);

      // Act
      await startupService.ensureEssentialData();

      // Assert - Should continue despite errors and log warning
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  Failed to create'),
        expect.any(Error)
      );
      // Should still attempt all 6 plans
      expect(mockPrisma.subscriptionPlan.upsert).toHaveBeenCalledTimes(6);
    });
  });

  describe('initialize', () => {
    it('should call ensureEssentialData and log initialization', async () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      mockPrisma.$connect.mockResolvedValue(undefined);
      mockPrisma.role.findUnique.mockResolvedValue({ name: 'CUSTOMER' }); // Role exists
      mockPrisma.role.findMany.mockResolvedValue([{ name: 'CUSTOMER', isActive: true }]); // Log existing roles
      mockPrisma.role.count.mockResolvedValue(4);
      mockPrisma.subscriptionPlan.count.mockResolvedValue(6);
      mockPrisma.subscriptionPlan.findMany.mockResolvedValue([
        { name: 'basic_tier1', displayName: 'Basic Plan', price: 949.00 },
      ]); // Log existing plans
      mockPrisma.user.findMany.mockResolvedValue([]);

      const ensureEssentialDataSpy = jest.spyOn(startupService, 'ensureEssentialData');

      // Act
      await startupService.initialize();

      // Assert
      expect(ensureEssentialDataSpy).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('🚀 Starting application initialization...');
      expect(logger.info).toHaveBeenCalledWith('✅ Application initialization completed');
    });
  });

  describe('Real behavior verification tests', () => {
    it('should NOT create roles if CUSTOMER role already exists (verifies conditional logic)', async () => {
      // Arrange - This test verifies the actual if/else logic in the code
      process.env.NODE_ENV = 'production';
      mockPrisma.$connect.mockResolvedValue(undefined);
      mockPrisma.role.findUnique.mockResolvedValue({ id: 'existing-role', name: 'CUSTOMER' }); // Role EXISTS
      mockPrisma.role.findMany.mockResolvedValue([{ name: 'CUSTOMER', isActive: true }]);
      mockPrisma.role.count.mockResolvedValue(4);
      mockPrisma.subscriptionPlan.count.mockResolvedValue(6);
      mockPrisma.subscriptionPlan.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      // Act
      await startupService.ensureEssentialData();

      // Assert - If role exists, createMany should NOT be called
      expect(mockPrisma.role.createMany).not.toHaveBeenCalled();
      expect(mockPrisma.role.findMany).toHaveBeenCalled(); // Should log existing roles instead
      expect(logger.info).toHaveBeenCalledWith('✅ Essential roles already exist');
    });

    it('should NOT create plans if count is exactly 6 (verifies boundary condition)', async () => {
      // Arrange - Testing the exact boundary: planCount < 6
      process.env.NODE_ENV = 'production';
      mockPrisma.$connect.mockResolvedValue(undefined);
      mockPrisma.role.findUnique.mockResolvedValue({ name: 'CUSTOMER' });
      mockPrisma.role.findMany.mockResolvedValue([{ name: 'CUSTOMER', isActive: true }]);
      mockPrisma.role.count.mockResolvedValue(4);
      mockPrisma.subscriptionPlan.count.mockResolvedValue(6); // Exactly 6, not less
      mockPrisma.subscriptionPlan.findMany.mockResolvedValue([
        { name: 'basic_tier1', displayName: 'Basic Plan', price: 949.00 },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      // Act
      await startupService.ensureEssentialData();

      // Assert - Should NOT create plans when count is 6 (not < 6)
      expect(mockPrisma.subscriptionPlan.upsert).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('✅ All subscription plans already exist');
    });

    it('should create plans if count is 5 (verifies < 6 condition works)', async () => {
      // Arrange - Testing count = 5, which is < 6
      process.env.NODE_ENV = 'production';
      mockPrisma.$connect.mockResolvedValue(undefined);
      mockPrisma.role.findUnique.mockResolvedValue({ name: 'CUSTOMER' });
      mockPrisma.role.findMany.mockResolvedValue([{ name: 'CUSTOMER', isActive: true }]);
      mockPrisma.role.count.mockResolvedValue(4);
      mockPrisma.subscriptionPlan.count
        .mockResolvedValueOnce(5) // Less than 6
        .mockResolvedValueOnce(11); // After creation
      mockPrisma.subscriptionPlan.upsert.mockResolvedValue({});
      mockPrisma.user.findMany.mockResolvedValue([]);

      // Act
      await startupService.ensureEssentialData();

      // Assert - Should create all 6 plans when count is 5
      expect(mockPrisma.subscriptionPlan.upsert).toHaveBeenCalledTimes(6);
      expect(logger.info).toHaveBeenCalledWith('⚠️  Found 5 subscription plans, creating missing plans...');
    });

    it('should NOT assign roles if no users without roles exist', async () => {
      // Arrange - Testing the conditional logic for user role assignment
      process.env.NODE_ENV = 'production';
      mockPrisma.$connect.mockResolvedValue(undefined);
      mockPrisma.role.findUnique.mockResolvedValue({ name: 'CUSTOMER' });
      mockPrisma.role.findMany.mockResolvedValue([{ name: 'CUSTOMER', isActive: true }]);
      mockPrisma.role.count.mockResolvedValue(4);
      mockPrisma.subscriptionPlan.count.mockResolvedValue(6);
      mockPrisma.subscriptionPlan.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]); // No users without roles

      // Act
      await startupService.ensureEssentialData();

      // Assert - Should NOT call userRole.create if no users need roles
      expect(mockPrisma.userRole.create).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('✅ All users have roles assigned');
    });

    it('should verify role data structure matches exact implementation values', async () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      mockPrisma.$connect.mockResolvedValue(undefined);
      mockPrisma.role.findUnique.mockResolvedValue(null);
      mockPrisma.role.createMany.mockResolvedValue({ count: 4 });
      mockPrisma.role.count.mockResolvedValue(4);
      mockPrisma.subscriptionPlan.count.mockResolvedValue(6);
      mockPrisma.user.findMany.mockResolvedValue([]);

      // Act
      await startupService.ensureEssentialData();

      // Assert - Verify the EXACT data structure from the implementation
      const createManyCall = mockPrisma.role.createMany.mock.calls[0][0];
      const rolesData = createManyCall.data;

      // Verify CUSTOMER role has exact values from implementation
      const customerRole = rolesData.find((r: any) => r.name === 'CUSTOMER');
      expect(customerRole).toMatchObject({
        name: 'CUSTOMER',
        displayName: 'Customer',
        description: 'Customer - can book appointments and view business information',
        level: 100,
        isSystem: true,
        isActive: true,
      });

      // Verify OWNER role has exact values
      const ownerRole = rolesData.find((r: any) => r.name === 'OWNER');
      expect(ownerRole).toMatchObject({
        name: 'OWNER',
        displayName: 'Business Owner',
        description: 'Business owner - can manage their own business, services, staff and appointments',
        level: 300,
        isSystem: true,
        isActive: true,
      });

      // Verify ADMIN has highest level
      const adminRole = rolesData.find((r: any) => r.name === 'ADMIN');
      expect(adminRole.level).toBe(1000);
      expect(adminRole.level).toBeGreaterThan(ownerRole.level);
      expect(ownerRole.level).toBeGreaterThan(customerRole.level);
    });

    it('should verify subscription plan prices match implementation exactly', async () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      mockPrisma.$connect.mockResolvedValue(undefined);
      mockPrisma.role.findUnique.mockResolvedValue({ name: 'CUSTOMER' });
      mockPrisma.role.findMany.mockResolvedValue([{ name: 'CUSTOMER', isActive: true }]);
      mockPrisma.role.count.mockResolvedValue(4);
      mockPrisma.subscriptionPlan.count
        .mockResolvedValueOnce(0) // No plans exist
        .mockResolvedValueOnce(6); // After creation
      mockPrisma.subscriptionPlan.upsert.mockResolvedValue({});
      mockPrisma.user.findMany.mockResolvedValue([]);

      // Act
      await startupService.ensureEssentialData();

      // Assert - Verify exact prices from implementation
      const calls = mockPrisma.subscriptionPlan.upsert.mock.calls;
      
      // Tier 1 prices
      const basicTier1 = calls.find((call: any) => call[0].where.name === 'basic_tier1');
      expect(basicTier1[0].create.price).toBe(949.00);
      
      const premiumTier1 = calls.find((call: any) => call[0].where.name === 'premium_tier1');
      expect(premiumTier1[0].create.price).toBe(1499.00);

      // Tier 2 prices (should be lower)
      const basicTier2 = calls.find((call: any) => call[0].where.name === 'basic_tier2');
      expect(basicTier2[0].create.price).toBe(799.00);
      
      const premiumTier2 = calls.find((call: any) => call[0].where.name === 'premium_tier2');
      expect(premiumTier2[0].create.price).toBe(1299.00);

      // Tier 3 prices (should be lowest)
      const basicTier3 = calls.find((call: any) => call[0].where.name === 'basic_tier3');
      expect(basicTier3[0].create.price).toBe(749.00);
      
      const premiumTier3 = calls.find((call: any) => call[0].where.name === 'premium_tier3');
      expect(premiumTier3[0].create.price).toBe(1199.00);

      // Verify pricing tier decreases: Tier 1 > Tier 2 > Tier 3
      expect(basicTier1[0].create.price).toBeGreaterThan(basicTier2[0].create.price);
      expect(basicTier2[0].create.price).toBeGreaterThan(basicTier3[0].create.price);
    });

    it('should handle case where CUSTOMER role is missing when assigning user roles', async () => {
      // Arrange - Testing error handling when role doesn't exist
      process.env.NODE_ENV = 'production';
      const mockUsers = [{ id: 'user-1', phoneNumber: '+9055512345678' }];

      mockPrisma.$connect.mockResolvedValue(undefined);
      mockPrisma.role.findUnique
        .mockResolvedValueOnce(null) // First call: CUSTOMER role missing
        .mockResolvedValueOnce(null); // Second call: Still missing when trying to assign
      mockPrisma.role.createMany.mockResolvedValue({ count: 4 });
      mockPrisma.role.count.mockResolvedValue(4);
      mockPrisma.subscriptionPlan.count.mockResolvedValue(6);
      mockPrisma.subscriptionPlan.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      // Act
      await startupService.ensureEssentialData();

      // Assert - Should log error and NOT create userRole if CUSTOMER role doesn't exist
      expect(mockPrisma.userRole.create).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith('❌ CUSTOMER role not found, cannot assign to users');
    });
  });
});
