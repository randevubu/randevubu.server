import { DiscountType } from '@prisma/client';
import { DiscountCodeRepository, DiscountCodeData, CreateDiscountCodeRequest, DiscountValidationResult } from '../../../repositories/discountCodeRepository';
import { RBACService } from '../rbac';
import { PermissionName } from '../../../types/auth';
import logger from "../../../utils/Logger/logger";
export interface CreateDiscountCodeServiceRequest extends Omit<CreateDiscountCodeRequest, 'code'> {
  code?: string; // Optional - will be auto-generated if not provided
}

export class DiscountCodeService {
  constructor(
    private discountCodeRepository: DiscountCodeRepository,
    private rbacService: RBACService
  ) {}

  async createDiscountCode(
    userId: string,
    data: CreateDiscountCodeServiceRequest
  ): Promise<DiscountCodeData> {
    // Only admins can create discount codes
    await this.rbacService.requirePermission(userId, PermissionName.MANAGE_ALL_SUBSCRIPTIONS);

    // Generate code if not provided
    const code = data.code || this.generateDiscountCode();

    // Validate code uniqueness
    const existingCode = await this.discountCodeRepository.findByCode(code);
    if (existingCode) {
      throw new Error('Discount code already exists');
    }

    // Validate discount value
    if (data.discountType === DiscountType.PERCENTAGE && data.discountValue > 100) {
      throw new Error('Percentage discount cannot exceed 100%');
    }

    if (data.discountValue <= 0) {
      throw new Error('Discount value must be positive');
    }

    // Validate dates
    if (data.validUntil && data.validFrom && data.validUntil <= data.validFrom) {
      throw new Error('Valid until date must be after valid from date');
    }

    return await this.discountCodeRepository.create({
      ...data,
      code,
      createdById: userId
    });
  }

  async updateDiscountCode(
    userId: string,
    discountCodeId: string,
    data: Partial<CreateDiscountCodeServiceRequest>
  ): Promise<DiscountCodeData> {
    // Only admins can update discount codes
    await this.rbacService.requirePermission(userId, PermissionName.MANAGE_ALL_SUBSCRIPTIONS);

    const existingCode = await this.discountCodeRepository.findById(discountCodeId);
    if (!existingCode) {
      throw new Error('Discount code not found');
    }

    // Check if code is being changed and validate uniqueness
    if (data.code && data.code !== existingCode.code) {
      const codeExists = await this.discountCodeRepository.findByCode(data.code);
      if (codeExists) {
        throw new Error('Discount code already exists');
      }
    }

    // Validate discount value
    if (data.discountType === DiscountType.PERCENTAGE && data.discountValue && data.discountValue > 100) {
      throw new Error('Percentage discount cannot exceed 100%');
    }

    if (data.discountValue !== undefined && data.discountValue <= 0) {
      throw new Error('Discount value must be positive');
    }

    const updatedCode = await this.discountCodeRepository.update(discountCodeId, data);
    if (!updatedCode) {
      throw new Error('Failed to update discount code');
    }

    return updatedCode;
  }

  async getDiscountCode(
    userId: string,
    discountCodeId: string
  ): Promise<DiscountCodeData> {
    // Only admins can view discount code details
    await this.rbacService.requirePermission(userId, PermissionName.VIEW_ALL_SUBSCRIPTIONS);

    const discountCode = await this.discountCodeRepository.findById(discountCodeId);
    if (!discountCode) {
      throw new Error('Discount code not found');
    }

    return discountCode;
  }

  async getAllDiscountCodes(
    userId: string,
    params: {
      page?: number;
      limit?: number;
      isActive?: boolean;
    } = {}
  ): Promise<{
    discountCodes: DiscountCodeData[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    // Only admins can view all discount codes
    await this.rbacService.requirePermission(userId, PermissionName.VIEW_ALL_SUBSCRIPTIONS);

    return await this.discountCodeRepository.findAll(params);
  }

  async validateDiscountCode(
    code: string,
    planId: string,
    amount: number,
    userId?: string
  ): Promise<DiscountValidationResult> {
    // Public method - anyone can validate a discount code during checkout
    return await this.discountCodeRepository.validateDiscountCode(code, planId, amount, userId);
  }

  async applyDiscountCode(
    code: string,
    userId: string,
    planId: string,
    amount: number,
    businessSubscriptionId?: string,
    paymentId?: string
  ): Promise<{
    success: boolean;
    discountAmount?: number;
    originalAmount?: number;
    finalAmount?: number;
    error?: string;
  }> {
    try {
      // Validate the discount code
      const validation = await this.validateDiscountCode(code, planId, amount, userId);
      
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errorMessage
        };
      }

      if (!validation.discountCode || !validation.calculatedDiscount) {
        return {
          success: false,
          error: 'Invalid discount calculation'
        };
      }

      // Record the usage
      await this.discountCodeRepository.recordUsage(
        validation.discountCode.id,
        userId,
        validation.calculatedDiscount.discountAmount,
        validation.calculatedDiscount.originalAmount,
        validation.calculatedDiscount.finalAmount,
        businessSubscriptionId,
        paymentId,
        {
          planId,
          appliedAt: new Date().toISOString()
        }
      );

      return {
        success: true,
        discountAmount: validation.calculatedDiscount.discountAmount,
        originalAmount: validation.calculatedDiscount.originalAmount,
        finalAmount: validation.calculatedDiscount.finalAmount
      };
    } catch (error) {
      logger.error('Apply discount code error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to apply discount code'
      };
    }
  }

  async deactivateDiscountCode(
    userId: string,
    discountCodeId: string
  ): Promise<boolean> {
    // Only admins can deactivate discount codes
    await this.rbacService.requirePermission(userId, PermissionName.MANAGE_ALL_SUBSCRIPTIONS);

    return await this.discountCodeRepository.deactivate(discountCodeId);
  }

  async deleteDiscountCode(
    userId: string,
    discountCodeId: string
  ): Promise<boolean> {
    // Only admins can delete discount codes
    await this.rbacService.requirePermission(userId, PermissionName.MANAGE_ALL_SUBSCRIPTIONS);

    const discountCode = await this.discountCodeRepository.findById(discountCodeId);
    if (!discountCode) {
      throw new Error('Discount code not found');
    }

    // Prevent deletion if code has been used
    if (discountCode.currentUsages > 0) {
      throw new Error('Cannot delete discount code that has been used. Deactivate it instead.');
    }

    return await this.discountCodeRepository.delete(discountCodeId);
  }

  async getDiscountCodeUsageHistory(
    userId: string,
    discountCodeId: string,
    params: {
      page?: number;
      limit?: number;
    } = {}
  ) {
    // Only admins can view usage history
    await this.rbacService.requirePermission(userId, PermissionName.VIEW_ALL_SUBSCRIPTIONS);

    const discountCode = await this.discountCodeRepository.findById(discountCodeId);
    if (!discountCode) {
      throw new Error('Discount code not found');
    }

    return await this.discountCodeRepository.getUsageHistory(discountCodeId, params);
  }

  async getDiscountCodeStatistics(userId: string) {
    // Only admins can view statistics
    await this.rbacService.requirePermission(userId, PermissionName.VIEW_ALL_ANALYTICS);

    return await this.discountCodeRepository.getStatistics();
  }

  // Utility methods
  async generateBulkDiscountCodes(
    userId: string,
    params: {
      prefix?: string;
      count: number;
      discountType: DiscountType;
      discountValue: number;
      maxUsages?: number;
      validUntil?: Date;
      minPurchaseAmount?: number;
      applicablePlans?: string[];
      description?: string;
    }
  ): Promise<DiscountCodeData[]> {
    // Only admins can create bulk discount codes
    await this.rbacService.requirePermission(userId, PermissionName.MANAGE_ALL_SUBSCRIPTIONS);

    if (params.count > 1000) {
      throw new Error('Cannot generate more than 1000 codes at once');
    }

    const codes: DiscountCodeData[] = [];
    const prefix = params.prefix || 'BULK';

    for (let i = 0; i < params.count; i++) {
      const code = this.generateDiscountCode(prefix);
      
      // Ensure uniqueness
      const existing = await this.discountCodeRepository.findByCode(code);
      if (existing) {
        i--; // Retry with different code
        continue;
      }

      const discountCode = await this.discountCodeRepository.create({
        code,
        name: `${prefix} Code ${i + 1}`,
        description: params.description,
        discountType: params.discountType,
        discountValue: params.discountValue,
        maxUsages: params.maxUsages || 1,
        validUntil: params.validUntil,
        minPurchaseAmount: params.minPurchaseAmount,
        applicablePlans: params.applicablePlans || [],
        metadata: {
          bulkGenerated: true,
          bulkPrefix: prefix,
          bulkIndex: i + 1
        },
        createdById: userId
      });

      codes.push(discountCode);
    }

    return codes;
  }

  private generateDiscountCode(prefix = 'SAVE'): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const codeLength = 8;
    let code = prefix;
    
    for (let i = 0; i < codeLength - prefix.length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return code;
  }

  // System methods for automated discount management
  async cleanupExpiredCodes(): Promise<{
    deactivated: number;
    errors: number;
  }> {
    // System method - no permission check needed
    const now = new Date();
    let deactivated = 0;
    let errors = 0;

    try {
      // Find active codes that have expired
      const expiredCodes = await this.discountCodeRepository.findAll({
        isActive: true,
        limit: 1000 // Process in batches
      });

      for (const code of expiredCodes.discountCodes) {
        if (code.validUntil && code.validUntil < now) {
          const success = await this.discountCodeRepository.deactivate(code.id);
          if (success) {
            deactivated++;
          } else {
            errors++;
          }
        }
      }
    } catch (error) {
      logger.error('Cleanup expired codes error:', error);
      errors++;
    }

    return { deactivated, errors };
  }

  async getDiscountCodeByCode(code: string): Promise<DiscountCodeData | null> {
    // Public method for checkout validation
    return await this.discountCodeRepository.findByCode(code);
  }

  /**
   * Store discount for later use (trial subscriptions)
   */
  async storePendingDiscount(
    code: string,
    subscriptionId: string,
    planId: string,
    amount: number,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate the discount code
      const validation = await this.validateDiscountCode(code, planId, amount, userId);
      
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errorMessage
        };
      }

      if (!validation.discountCode || !validation.calculatedDiscount) {
        return {
          success: false,
          error: 'Invalid discount calculation'
        };
      }

      // Store in subscription metadata (this will be handled by the subscription service)
      return {
        success: true
      };
    } catch (error) {
      logger.error('Store pending discount error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to store pending discount'
      };
    }
  }

  /**
   * Apply pending discount (trial conversion, renewals)
   */
  async applyPendingDiscount(
    subscriptionId: string,
    paymentId: string,
    actualAmount: number
  ): Promise<{
    success: boolean;
    discountApplied?: {
      code: string;
      discountAmount: number;
      originalAmount: number;
      finalAmount: number;
    };
    error?: string;
  }> {
    try {
      // Get subscription to check for pending discount
      const subscription = await this.discountCodeRepository.findSubscriptionById(subscriptionId);
      
      if (!subscription || !subscription.metadata?.pendingDiscount) {
        return {
          success: false,
          error: 'No pending discount found'
        };
      }

      const pending = subscription.metadata.pendingDiscount;
      
      // Calculate discount amount
      let discountAmount = 0;
      if (pending.discountType === 'PERCENTAGE') {
        discountAmount = actualAmount * (pending.discountValue / 100);
      } else {
        discountAmount = Math.min(pending.discountValue, actualAmount);
      }

      const finalAmount = Math.max(0, actualAmount - discountAmount);

      // Record the usage
      await this.discountCodeRepository.recordUsage(
        pending.discountCodeId,
        subscription.business.ownerId,
        discountAmount,
        actualAmount,
        finalAmount,
        subscriptionId,
        paymentId,
        {
          planId: subscription.planId,
          appliedAt: new Date().toISOString(),
          paymentType: 'TRIAL_CONVERSION'
        }
      );

      return {
        success: true,
        discountApplied: {
          code: pending.code,
          discountAmount,
          originalAmount: actualAmount,
          finalAmount
        }
      };
    } catch (error) {
      logger.error('Apply pending discount error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to apply pending discount'
      };
    }
  }

  /**
   * Add discount to existing subscription
   */
  async addDiscountToSubscription(
    subscriptionId: string,
    code: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get subscription details
      const subscription = await this.discountCodeRepository.findSubscriptionById(subscriptionId);
      
      if (!subscription) {
        return {
          success: false,
          error: 'Subscription not found'
        };
      }

      // Get plan details
      const plan = await this.discountCodeRepository.findPlanById(subscription.planId);
      
      if (!plan) {
        return {
          success: false,
          error: 'Plan not found'
        };
      }

      // Validate the discount code
      const validation = await this.validateDiscountCode(
        code,
        subscription.planId,
        Number(plan.price),
        userId
      );
      
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errorMessage
        };
      }

      if (!validation.discountCode || !validation.calculatedDiscount) {
        return {
          success: false,
          error: 'Invalid discount calculation'
        };
      }

      // Update subscription metadata with new discount
      const discountMetadata = {
        code: code,
        validatedAt: new Date().toISOString(),
        appliedToPayments: [],
        isRecurring: validation.discountCode.metadata?.isRecurring || false,
        remainingUses: validation.discountCode.metadata?.maxRecurringUses || 1,
        discountType: validation.discountCode.discountType,
        discountValue: Number(validation.discountCode.discountValue),
        discountCodeId: validation.discountCode.id
      };

      await this.discountCodeRepository.updateSubscriptionMetadata(
        subscriptionId,
        { pendingDiscount: discountMetadata }
      );

      return {
        success: true
      };
    } catch (error) {
      logger.error('Add discount to subscription error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add discount to subscription'
      };
    }
  }

  /**
   * Check if discount can be applied to this payment
   */
  async canApplyToPayment(
    subscriptionId: string,
    paymentType: 'INITIAL' | 'TRIAL_CONVERSION' | 'RENEWAL'
  ): Promise<boolean> {
    try {
      const subscription = await this.discountCodeRepository.findSubscriptionById(subscriptionId);
      
      if (!subscription || !subscription.metadata?.pendingDiscount) {
        return false;
      }

      const pending = subscription.metadata.pendingDiscount;
      
      // Check if discount is still valid
      const now = new Date();
      const validatedAt = new Date(pending.validatedAt);
      
      // Check if discount has expired (24 hours validation window)
      if (now.getTime() - validatedAt.getTime() > 24 * 60 * 60 * 1000) {
        return false;
      }

      // Check remaining uses for recurring discounts
      if (pending.isRecurring && pending.remainingUses <= 0) {
        return false;
      }

      // Check if this payment type is allowed
      if (paymentType === 'INITIAL' && pending.appliedToPayments.length > 0) {
        return false; // Already applied to initial payment
      }

      if (paymentType === 'TRIAL_CONVERSION' && pending.appliedToPayments.some((p: string) => p.startsWith('trial_'))) {
        return false; // Already applied to trial conversion
      }

      if (paymentType === 'RENEWAL' && !pending.isRecurring) {
        return false; // Non-recurring discount cannot be applied to renewals
      }

      return true;
    } catch (error) {
      logger.error('Can apply to payment error:', error);
      return false;
    }
  }
}
