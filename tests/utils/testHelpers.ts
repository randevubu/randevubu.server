import { PrismaClient } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

export class TestHelpers {
  private static prisma: PrismaClient;

  static setPrisma(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  static getPrisma(): PrismaClient {
    return this.prisma || (global as any).prisma;
  }

  // User creation helpers
  static async createTestUser(userData: Partial<any> = {}) {
    const prisma = this.getPrisma();
    const userId = uuidv4();
    
    const user = await prisma.user.create({
      data: {
        id: userId,
        phoneNumber: userData.phoneNumber || '+905551234567',
        firstName: userData.firstName || 'Test',
        lastName: userData.lastName || 'User',
        isActive: userData.isActive !== undefined ? userData.isActive : true,
        isVerified: userData.isVerified !== undefined ? userData.isVerified : true,
        timezone: userData.timezone || 'Europe/Istanbul',
        language: userData.language || 'tr',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return user;
  }

  static async createTestBusiness(businessData: Partial<any> = {}) {
    const prisma = this.getPrisma();
    const businessId = uuidv4();
    
    // Create business type if not exists
    let businessType = await prisma.businessType.findFirst();
    if (!businessType) {
      businessType = await prisma.businessType.create({
        data: {
          id: uuidv4(),
          name: 'test-type',
          displayName: 'Test Type',
          description: 'Test business type',
          category: 'test',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    const business = await prisma.business.create({
      data: {
        id: businessId,
        ownerId: businessData.ownerId || (await this.createTestUser()).id,
        businessTypeId: businessType.id,
        name: businessData.name || 'Test Business',
        slug: businessData.slug || `test-business-${Date.now()}`,
        description: businessData.description || 'Test business description',
        email: businessData.email || 'test@example.com',
        phone: businessData.phone || '+905551234567',
        address: businessData.address || 'Test Address',
        city: businessData.city || 'Istanbul',
        state: businessData.state || 'Istanbul',
        country: businessData.country || 'Turkey',
        timezone: businessData.timezone || 'Europe/Istanbul',
        isActive: businessData.isActive !== undefined ? businessData.isActive : true,
        isVerified: businessData.isVerified !== undefined ? businessData.isVerified : false,
        isClosed: businessData.isClosed !== undefined ? businessData.isClosed : false,
        tags: businessData.tags || [],
        businessHours: businessData.businessHours || {
          monday: { openTime: '09:00', closeTime: '18:00', isOpen: true },
          tuesday: { openTime: '09:00', closeTime: '18:00', isOpen: true },
          wednesday: { openTime: '09:00', closeTime: '18:00', isOpen: true },
          thursday: { openTime: '09:00', closeTime: '18:00', isOpen: true },
          friday: { openTime: '09:00', closeTime: '18:00', isOpen: true },
          saturday: { openTime: '10:00', closeTime: '16:00', isOpen: true },
          sunday: { openTime: '10:00', closeTime: '16:00', isOpen: false }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return business;
  }

  static async createTestService(serviceData: Partial<any> = {}) {
    const prisma = this.getPrisma();
    const serviceId = uuidv4();
    
    const business = serviceData.businessId ? 
      await prisma.business.findUnique({ where: { id: serviceData.businessId } }) :
      await this.createTestBusiness();

    if (!business) {
      throw new Error('Business not found');
    }

    const service = await prisma.service.create({
      data: {
        id: serviceId,
        businessId: business.id,
        name: serviceData.name || 'Test Service',
        description: serviceData.description || 'Test service description',
        duration: serviceData.duration || 60,
        price: serviceData.price || 100.00,
        currency: serviceData.currency || 'TRY',
        isActive: serviceData.isActive !== undefined ? serviceData.isActive : true,
        // showPrice: serviceData.showPrice !== undefined ? serviceData.showPrice : true,
        sortOrder: serviceData.sortOrder || 0,
        bufferTime: serviceData.bufferTime || 0,
        maxAdvanceBooking: serviceData.maxAdvanceBooking || 30,
        minAdvanceBooking: serviceData.minAdvanceBooking || 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return service;
  }

  static async createTestAppointment(appointmentData: Partial<any> = {}) {
    const prisma = this.getPrisma();
    const appointmentId = uuidv4();
    
    const customer = appointmentData.customerId ? 
      await prisma.user.findUnique({ where: { id: appointmentData.customerId } }) :
      await this.createTestUser();

    const service = appointmentData.serviceId ? 
      await prisma.service.findUnique({ where: { id: appointmentData.serviceId } }) :
      await this.createTestService();

    if (!customer || !service) {
      throw new Error('Customer or service not found');
    }

    const startTime = appointmentData.startTime || new Date();
    const endTime = new Date(startTime.getTime() + (service.duration * 60000));

    const appointment = await prisma.appointment.create({
      data: {
        id: appointmentId,
        businessId: service.businessId,
        serviceId: service.id,
        staffId: appointmentData.staffId || null,
        customerId: customer.id,
        date: new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate()),
        startTime: startTime,
        endTime: endTime,
        duration: service.duration,
        status: appointmentData.status || 'CONFIRMED',
        price: service.price,
        currency: service.currency,
        customerNotes: appointmentData.customerNotes || null,
        internalNotes: appointmentData.internalNotes || null,
        bookedAt: new Date(),
        reminderSent: appointmentData.reminderSent || false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return appointment;
  }

  // JWT token helpers
  static generateJWTToken(userId: string, businessId?: string): string {
    const secret = process.env.JWT_ACCESS_SECRET || 'test-secret';
    const payload = {
      userId,
      businessId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (15 * 60) // 15 minutes
    };

    return jwt.sign(payload, secret);
  }

  static generateRefreshToken(userId: string): string {
    const secret = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
    const payload = {
      userId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
    };

    return jwt.sign(payload, secret);
  }

  // Mock request/response helpers
  static createMockRequest(overrides: Partial<Request> = {}): any {
    return {
      body: {},
      query: {},
      params: {},
      headers: {},
      ip: '127.0.0.1',
      method: 'GET',
      url: '/test',
      path: '/test',
      get: jest.fn((header: string) => {
        const headers = overrides.headers || {};
        return headers[header.toLowerCase()] || headers[header];
      }),
      ...overrides
    };
  }

  static createMockResponse(): Response {
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      getHeader: jest.fn(),
      statusCode: 200,
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis()
    };

    return res as Response;
  }

  static createMockNext(): NextFunction {
    return jest.fn();
  }

  // Database cleanup helpers
  static async cleanupDatabase() {
    const prisma = this.getPrisma();
    
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
        await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
      } catch (error) {
        // Ignore errors for tables that don't exist or have constraints
        console.warn(`Could not clean table ${table}:`, error);
      }
    }
  }

  // Test data factories
  static createValidUserData() {
    return {
      phoneNumber: '+905551234567',
      firstName: 'Test',
      lastName: 'User'
    };
  }

  static createValidBusinessData() {
    return {
      name: 'Test Business',
      description: 'Test business description',
      email: 'test@example.com',
      phone: '+905551234567',
      address: 'Test Address',
      city: 'Istanbul',
      state: 'Istanbul',
      country: 'Turkey'
    };
  }

  static createValidServiceData() {
    return {
      name: 'Test Service',
      description: 'Test service description',
      duration: 60,
      price: 100.00,
      currency: 'TRY'
    };
  }

  static createValidAppointmentData() {
    return {
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      customerNotes: 'Test appointment'
    };
  }

  // Authentication helpers
  static createAuthenticatedRequest(userId: string, businessId?: string): any {
    const token = this.generateJWTToken(userId, businessId);
    
    return {
      ...this.createMockRequest(),
      headers: {
        authorization: `Bearer ${token}`
      },
      user: {
        id: userId,
        phoneNumber: '+905551234567',
        isVerified: true,
        isActive: true
      }
    };
  }

  // Error simulation helpers
  static createDatabaseError() {
    return new Error('Database connection failed');
  }

  static createValidationError(field: string, message: string) {
    const error = new Error(`Validation failed: ${message}`);
    (error as any).field = field;
    return error;
  }

  static createUnauthorizedError() {
    const error = new Error('Unauthorized');
    (error as any).statusCode = 401;
    return error;
  }

  static createForbiddenError() {
    const error = new Error('Forbidden');
    (error as any).statusCode = 403;
    return error;
  }
}