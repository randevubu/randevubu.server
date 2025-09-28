import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load test environment variables
config({ path: '.env.test' });

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/randevubu_test';
  
  // Initialize test database connection
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  // Store prisma instance globally for tests
  (global as any).prisma = prisma;
});

afterAll(async () => {
  // Clean up test database
  if ((global as any).prisma) {
    await (global as any).prisma.$disconnect();
  }
});

// Clean up after each test
afterEach(async () => {
  if ((global as any).prisma) {
    // Clean up test data
    const tables = [
      'audit_logs',
      'phone_verifications',
      'refresh_tokens',
      'user_roles',
      'role_permissions',
      'business_subscriptions',
      'stored_payment_methods',
      'payments',
      'appointment_payments',
      'user_behavior',
      'business_closures',
      'availability_alerts',
      'closure_notifications',
      'reschedule_suggestions',
      'discount_code_usages',
      'discount_codes',
      'business_usage',
      'daily_sms_usage',
      'business_hours_overrides',
      'push_subscriptions',
      'notification_preferences',
      'push_notifications',
      'business_notification_settings',
      'appointments',
      'working_hours',
      'business_images',
      'service_staff',
      'services',
      'business_staff',
      'businesses',
      'subscription_plans',
      'business_types',
      'roles',
      'permissions',
      'users'
    ];

    // Delete in reverse order to respect foreign key constraints
    for (const table of tables.reverse()) {
      try {
        await (global as any).prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
      } catch (error) {
        // Ignore errors for tables that don't exist or have constraints
        console.warn(`Could not clean table ${table}:`, error);
      }
    }
  }
});

// Global test utilities
declare global {
  var prisma: PrismaClient;
}

// Mock console methods in tests to reduce noise
const originalConsole = console;
beforeAll(() => {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as any;
});

afterAll(() => {
  global.console = originalConsole;
});

// Increase timeout for all tests
jest.setTimeout(30000);