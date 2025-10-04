import { PrismaClient } from '@prisma/client';
import { BusinessData } from '../types/business';

export interface CustomerRelationship {
  customerId: string;
  businessId: string;
  relationshipType: 'ACTIVE_CUSTOMER' | 'PAST_CUSTOMER' | 'NO_RELATIONSHIP';
  lastAppointmentDate?: Date;
  totalAppointments: number;
  totalSpent: number;
  isOptedOut: boolean;
  subscriptionStatus: 'SUBSCRIBED' | 'UNSUBSCRIBED' | 'BLOCKED';
}

export interface CustomerValidationResult {
  isValid: boolean;
  relationship?: CustomerRelationship;
  reason?: string;
  errorCode?: string;
}

export interface BusinessCustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  optedOutCustomers: number;
  blockedCustomers: number;
  last30DaysCustomers: number;
}

export class CustomerRelationshipService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Validate if a customer has a legitimate relationship with a business
   * Industry Standard: Multi-layered validation with relationship scoring
   */
  async validateCustomerRelationship(
    businessId: string,
    customerId: string,
    options: {
      requireActiveAppointment?: boolean;
      allowPastCustomers?: boolean;
      checkOptOutStatus?: boolean;
    } = {}
  ): Promise<CustomerValidationResult> {
    try {
      // 1. Check if business exists and is active
      const business = await this.prisma.business.findUnique({
        where: { id: businessId },
        select: { id: true, isActive: true, isClosed: true }
      });

      if (!business) {
        return {
          isValid: false,
          reason: 'Business not found',
          errorCode: 'BUSINESS_NOT_FOUND'
        };
      }

      if (!business.isActive) {
        return {
          isValid: false,
          reason: 'Business is inactive',
          errorCode: 'BUSINESS_INACTIVE'
        };
      }

      if (business.isClosed) {
        return {
          isValid: false,
          reason: 'Business is currently closed',
          errorCode: 'BUSINESS_CLOSED'
        };
      }

      // 2. Check if customer exists and is active
      const customer = await this.prisma.user.findUnique({
        where: { id: customerId },
        select: { id: true, isActive: true, lockedUntil: true }
      });

      if (!customer) {
        return {
          isValid: false,
          reason: 'Customer not found',
          errorCode: 'CUSTOMER_NOT_FOUND'
        };
      }

      if (!customer.isActive) {
        return {
          isValid: false,
          reason: 'Customer account is inactive',
          errorCode: 'CUSTOMER_INACTIVE'
        };
      }

      if (customer.lockedUntil && customer.lockedUntil > new Date()) {
        return {
          isValid: false,
          reason: 'Customer account is locked',
          errorCode: 'CUSTOMER_LOCKED'
        };
      }

      // 3. Get customer relationship data
      const relationship = await this.getCustomerRelationship(businessId, customerId);

      if (!relationship) {
        return {
          isValid: false,
          reason: 'No relationship found between customer and business',
          errorCode: 'NO_RELATIONSHIP'
        };
      }

      // 4. Check opt-out status
      if (options.checkOptOutStatus && relationship.isOptedOut) {
        return {
          isValid: false,
          reason: 'Customer has opted out of notifications',
          errorCode: 'CUSTOMER_OPTED_OUT'
        };
      }

      // 5. Check subscription status
      if (relationship.subscriptionStatus === 'BLOCKED') {
        return {
          isValid: false,
          reason: 'Customer has blocked notifications',
          errorCode: 'CUSTOMER_BLOCKED_NOTIFICATIONS'
        };
      }

      // 6. Check relationship requirements
      if (options.requireActiveAppointment && relationship.relationshipType !== 'ACTIVE_CUSTOMER') {
        return {
          isValid: false,
          reason: 'Customer has no active appointments',
          errorCode: 'NO_ACTIVE_APPOINTMENTS'
        };
      }

      if (!options.allowPastCustomers && relationship.relationshipType === 'PAST_CUSTOMER') {
        return {
          isValid: false,
          reason: 'Only active customers allowed',
          errorCode: 'PAST_CUSTOMER_NOT_ALLOWED'
        };
      }

      return {
        isValid: true,
        relationship
      };

    } catch (error) {
      console.error('Error validating customer relationship:', error);
      return {
        isValid: false,
        reason: 'Internal error during validation',
        errorCode: 'VALIDATION_ERROR'
      };
    }
  }

  /**
   * Get comprehensive customer relationship data
   * Industry Standard: Rich relationship profiling
   */
  async getCustomerRelationship(
    businessId: string,
    customerId: string
  ): Promise<CustomerRelationship | null> {
    try {
      // Get appointment history
      const appointments = await this.prisma.appointment.findMany({
        where: {
          businessId,
          customerId
        },
        select: {
          id: true,
          startTime: true,
          status: true,
          price: true,
          createdAt: true
        },
        orderBy: { startTime: 'desc' }
      });

      if (appointments.length === 0) {
        return null;
      }

      // Calculate relationship metrics
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      const confirmedAppointments = appointments.filter(apt => 
        ['CONFIRMED', 'COMPLETED'].includes(apt.status)
      );

      const recentAppointments = confirmedAppointments.filter(apt => 
        apt.startTime >= thirtyDaysAgo
      );

      const totalSpent = confirmedAppointments.reduce((sum, apt) => 
        sum + Number(apt.price), 0
      );

      const lastAppointmentDate = confirmedAppointments[0]?.startTime;

      // Determine relationship type
      let relationshipType: 'ACTIVE_CUSTOMER' | 'PAST_CUSTOMER' | 'NO_RELATIONSHIP';
      if (recentAppointments.length > 0) {
        relationshipType = 'ACTIVE_CUSTOMER';
      } else if (confirmedAppointments.length > 0) {
        relationshipType = 'PAST_CUSTOMER';
      } else {
        relationshipType = 'NO_RELATIONSHIP';
      }

      // Check notification preferences
      const notificationPrefs = await this.prisma.notificationPreference.findUnique({
        where: { userId: customerId }
      });

      const isOptedOut = notificationPrefs?.enableBusinessNotifications === false;
      const subscriptionStatus = isOptedOut ? 'UNSUBSCRIBED' : 'SUBSCRIBED';

      return {
        customerId,
        businessId,
        relationshipType,
        lastAppointmentDate,
        totalAppointments: confirmedAppointments.length,
        totalSpent,
        isOptedOut: !!isOptedOut,
        subscriptionStatus
      };

    } catch (error) {
      console.error('Error getting customer relationship:', error);
      return null;
    }
  }

  /**
   * Get all valid customers for a business with filtering options
   * Industry Standard: Paginated, filtered customer retrieval
   */
  async getBusinessCustomers(
    businessId: string,
    options: {
      relationshipType?: 'ACTIVE_CUSTOMER' | 'PAST_CUSTOMER' | 'ALL';
      includeOptedOut?: boolean;
      includeBlocked?: boolean;
      minAppointments?: number;
      lastAppointmentAfter?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    customers: CustomerRelationship[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const {
        relationshipType = 'ALL',
        includeOptedOut = false,
        includeBlocked = false,
        minAppointments = 0,
        lastAppointmentAfter,
        limit = 1000,
        offset = 0
      } = options;

      // Build base query
      let whereClause: any = {
        businessId,
        status: { in: ['CONFIRMED', 'COMPLETED'] }
      };

      if (lastAppointmentAfter) {
        whereClause.startTime = { gte: lastAppointmentAfter };
      }

      // Get appointments with customer data
      const appointments = await this.prisma.appointment.findMany({
        where: whereClause,
        select: {
          customerId: true,
          startTime: true,
          status: true,
          price: true,
          customer: {
            select: {
              id: true,
              isActive: true,
              lockedUntil: true
            }
          }
        },
        orderBy: { startTime: 'desc' }
      });

      // Group by customer and calculate metrics
      const customerMap = new Map<string, CustomerRelationship>();

      for (const apt of appointments) {
        if (!customerMap.has(apt.customerId)) {
          const relationship = await this.getCustomerRelationship(businessId, apt.customerId);
          if (relationship) {
            customerMap.set(apt.customerId, relationship);
          }
        }
      }

      // Filter customers based on criteria
      let filteredCustomers = Array.from(customerMap.values());

      // Apply filters
      if (relationshipType !== 'ALL') {
        filteredCustomers = filteredCustomers.filter(c => c.relationshipType === relationshipType);
      }

      if (!includeOptedOut) {
        filteredCustomers = filteredCustomers.filter(c => !c.isOptedOut);
      }

      if (!includeBlocked) {
        filteredCustomers = filteredCustomers.filter(c => c.subscriptionStatus !== 'BLOCKED');
      }

      if (minAppointments > 0) {
        filteredCustomers = filteredCustomers.filter(c => c.totalAppointments >= minAppointments);
      }

      // Apply pagination
      const total = filteredCustomers.length;
      const paginatedCustomers = filteredCustomers.slice(offset, offset + limit);
      const hasMore = offset + limit < total;

      return {
        customers: paginatedCustomers,
        total,
        hasMore
      };

    } catch (error) {
      console.error('Error getting business customers:', error);
      throw new Error('Failed to retrieve business customers');
    }
  }

  /**
   * Get business customer statistics
   * Industry Standard: Comprehensive analytics
   */
  async getBusinessCustomerStats(businessId: string): Promise<BusinessCustomerStats> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get all customers
      const allCustomers = await this.getBusinessCustomers(businessId, { 
        includeOptedOut: true, 
        includeBlocked: true 
      });

      // Get recent customers
      const recentCustomers = await this.getBusinessCustomers(businessId, {
        lastAppointmentAfter: thirtyDaysAgo,
        includeOptedOut: true,
        includeBlocked: true
      });

      return {
        totalCustomers: allCustomers.total,
        activeCustomers: allCustomers.customers.filter(c => c.relationshipType === 'ACTIVE_CUSTOMER').length,
        optedOutCustomers: allCustomers.customers.filter(c => c.isOptedOut).length,
        blockedCustomers: allCustomers.customers.filter(c => c.subscriptionStatus === 'BLOCKED').length,
        last30DaysCustomers: recentCustomers.total
      };

    } catch (error) {
      console.error('Error getting business customer stats:', error);
      throw new Error('Failed to retrieve customer statistics');
    }
  }

  /**
   * Validate multiple customer relationships in batch
   * Industry Standard: Efficient batch validation
   */
  async validateCustomerRelationships(
    businessId: string,
    customerIds: string[],
    options: {
      requireActiveAppointment?: boolean;
      allowPastCustomers?: boolean;
      checkOptOutStatus?: boolean;
    } = {}
  ): Promise<{
    validCustomers: string[];
    invalidCustomers: Array<{
      customerId: string;
      reason: string;
      errorCode: string;
    }>;
    validCount: number;
    invalidCount: number;
  }> {
    const validCustomers: string[] = [];
    const invalidCustomers: Array<{
      customerId: string;
      reason: string;
      errorCode: string;
    }> = [];

    // Process in batches to avoid overwhelming the database
    const batchSize = 50;
    for (let i = 0; i < customerIds.length; i += batchSize) {
      const batch = customerIds.slice(i, i + batchSize);
      
      const validationPromises = batch.map(async (customerId) => {
        const result = await this.validateCustomerRelationship(
          businessId,
          customerId,
          options
        );

        if (result.isValid) {
          validCustomers.push(customerId);
        } else {
          invalidCustomers.push({
            customerId,
            reason: result.reason || 'Unknown error',
            errorCode: result.errorCode || 'UNKNOWN_ERROR'
          });
        }
      });

      await Promise.all(validationPromises);
    }

    return {
      validCustomers,
      invalidCustomers,
      validCount: validCustomers.length,
      invalidCount: invalidCustomers.length
    };
  }
}

