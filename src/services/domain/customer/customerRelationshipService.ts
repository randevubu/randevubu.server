import { PrismaClient } from '@prisma/client';
import { BusinessData } from '../../../types/business';

import { CustomerRelationship, CustomerValidationResult, BusinessCustomerStats } from '../../../types/customer';
import logger from "../../../utils/Logger/logger";
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
          reason: 'NOT_FOUND',
          error: 'Business not found'
        };
      }

      if (!business.isActive) {
        return {
          isValid: false,
          reason: 'NOT_FOUND',
          error: 'Business is inactive'
        };
      }

      if (business.isClosed) {
        return {
          isValid: false,
          reason: 'NOT_FOUND',
          error: 'Business is currently closed'
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
          reason: 'NOT_FOUND',
          error: 'Customer not found'
        };
      }

      if (!customer.isActive) {
        return {
          isValid: false,
          reason: 'INACTIVE',
          error: 'Customer account is inactive'
        };
      }

      if (customer.lockedUntil && customer.lockedUntil > new Date()) {
        return {
          isValid: false,
          reason: 'BLOCKED',
          error: 'Customer account is locked'
        };
      }

      // 3. Get customer relationship data
      const relationship = await this.getCustomerRelationship(businessId, customerId);

      if (!relationship) {
        return {
          isValid: false,
          reason: 'NO_RELATIONSHIP',
          error: 'No relationship found between customer and business'
        };
      }

      // 4. Check opt-out status
      if (options.checkOptOutStatus && relationship.relationshipType === 'OPTED_OUT') {
        return {
          isValid: false,
          reason: 'OPTED_OUT',
          error: 'Customer has opted out of notifications'
        };
      }

      // 5. Check subscription status
      if (relationship.relationshipType === 'BLOCKED') {
        return {
          isValid: false,
          reason: 'BLOCKED',
          error: 'Customer has blocked notifications'
        };
      }

      // 6. Check relationship requirements
      if (options.requireActiveAppointment && relationship.relationshipType !== 'ACTIVE') {
        return {
          isValid: false,
          reason: 'INACTIVE',
          error: 'Customer has no active appointments'
        };
      }

      if (!options.allowPastCustomers && relationship.relationshipType === 'INACTIVE') {
        return {
          isValid: false,
          reason: 'INACTIVE',
          error: 'Only active customers allowed'
        };
      }

      return {
        isValid: true,
        relationship
      };

    } catch (error) {
      logger.error('Error validating customer relationship:', error);
        return {
          isValid: false,
          reason: 'NOT_FOUND',
          error: 'Internal error during validation'
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
          serviceId: true,
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
      const firstAppointmentDate = confirmedAppointments[confirmedAppointments.length - 1]?.startTime;

      const serviceFrequency = confirmedAppointments.reduce((map, apt: any) => {
        if (apt.serviceId) {
          map.set(apt.serviceId, (map.get(apt.serviceId) || 0) + 1);
        }
        return map;
      }, new Map<string, number>());

      const preferredServices = Array.from(serviceFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([serviceId]) => serviceId);

      // Determine relationship type
      let relationshipType: 'ACTIVE' | 'INACTIVE' | 'NO_RELATIONSHIP';
      if (recentAppointments.length > 0) {
        relationshipType = 'ACTIVE';
      } else if (confirmedAppointments.length > 0) {
        relationshipType = 'INACTIVE';
      } else {
        relationshipType = 'NO_RELATIONSHIP';
      }

      // Check notification preferences
      const notificationPrefs = await this.prisma.notificationPreference.findUnique({
        where: { userId: customerId }
      });

      const isOptedOut = notificationPrefs?.enableBusinessNotifications === false;

      return {
        customerId,
        businessId,
        relationshipType: isOptedOut ? 'OPTED_OUT' : (relationshipType === 'NO_RELATIONSHIP' ? 'INACTIVE' : relationshipType),
        firstAppointmentDate,
        lastAppointmentDate,
        totalAppointments: confirmedAppointments.length,
        totalSpent,
        preferredServices,
        notificationPreferences: {
          sms: notificationPrefs?.enableAppointmentReminders ?? true,
          email: notificationPrefs?.enableBusinessNotifications ?? true,
          push: notificationPrefs?.enablePromotionalMessages ?? true
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

    } catch (error) {
      logger.error('Error getting customer relationship:', error);
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
      relationshipType?: 'ACTIVE' | 'INACTIVE' | 'ALL';
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
        filteredCustomers = filteredCustomers.filter(c => c.relationshipType !== 'OPTED_OUT');
      }

      if (!includeBlocked) {
        filteredCustomers = filteredCustomers.filter(c => c.relationshipType !== 'BLOCKED');
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
      logger.error('Error getting business customers:', error);
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

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      let totalSpentAggregate = 0;
      let totalAppointmentsAggregate = 0;

      allCustomers.customers.forEach(customer => {
        totalSpentAggregate += customer.totalSpent;
        totalAppointmentsAggregate += customer.totalAppointments;
      });

      const newCustomersThisMonth = allCustomers.customers.filter(customer => {
        return customer.firstAppointmentDate && customer.firstAppointmentDate >= startOfMonth;
      }).length;

      const returningCustomers = allCustomers.customers.filter(customer => {
        return (
          customer.firstAppointmentDate &&
          customer.firstAppointmentDate < startOfMonth &&
          customer.lastAppointmentDate &&
          customer.lastAppointmentDate >= startOfMonth
        );
      }).length;

      const topSpendingCustomers = allCustomers.customers
        .map(customer => ({
          customerId: customer.customerId,
          totalSpent: customer.totalSpent,
          appointmentCount: customer.totalAppointments
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 5);

      const averageSpending = allCustomers.total > 0
        ? totalSpentAggregate / allCustomers.total
        : 0;

      const averageAppointmentsPerCustomer = allCustomers.total > 0
        ? totalAppointmentsAggregate / allCustomers.total
        : 0;

      const customerRetentionRate = allCustomers.total > 0
        ? (recentCustomers.total / allCustomers.total) * 100
        : 0;

      return {
        totalCustomers: allCustomers.total,
        activeCustomers: allCustomers.customers.filter(c => c.relationshipType === 'ACTIVE').length,
        optedOutCustomers: allCustomers.customers.filter(c => c.relationshipType === 'OPTED_OUT').length,
        blockedCustomers: allCustomers.customers.filter(c => c.relationshipType === 'BLOCKED').length,
        last30DaysCustomers: recentCustomers.total,
        newCustomersThisMonth,
        returningCustomers,
        averageSpending,
        topSpendingCustomers,
        customerRetentionRate,
        averageAppointmentsPerCustomer
      };

    } catch (error) {
      logger.error('Error getting business customer stats:', error);
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
            errorCode: result.error || 'UNKNOWN_ERROR'
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
