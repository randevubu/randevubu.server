/**
 * Customer Management Service
 * Handles business customer management settings and features
 */

import { CustomerManagementSettings, CustomerNote, CustomerEvaluation, BirthdayReminder, CustomerLoyaltyStatus, DEFAULT_CUSTOMER_MANAGEMENT_SETTINGS } from '../../../types/customerManagement';
import { BusinessRepository } from '../../../repositories/businessRepository';
import { UserBehaviorRepository } from '../../../repositories/userBehaviorRepository';
import { PrismaClient } from '@prisma/client';
import { getCurrentTimeInIstanbul } from '../../../utils/timezoneHelper';

export class CustomerManagementService {
  constructor(
    private businessRepository: BusinessRepository,
    private userBehaviorRepository: UserBehaviorRepository,
    private prisma: PrismaClient
  ) {}

  /**
   * Get business customer management settings
   */
  async getBusinessCustomerManagementSettings(businessId: string): Promise<CustomerManagementSettings> {
    const business = await this.businessRepository.findById(businessId);
    
    if (!business || !business.settings) {
      return DEFAULT_CUSTOMER_MANAGEMENT_SETTINGS;
    }

    const settings = business.settings as Record<string, unknown>;
    const customerManagement = settings.customerManagement as CustomerManagementSettings | undefined;

    if (!customerManagement) {
      return DEFAULT_CUSTOMER_MANAGEMENT_SETTINGS;
    }

    // Merge with defaults to ensure all fields are present
    return {
      ...DEFAULT_CUSTOMER_MANAGEMENT_SETTINGS,
      ...customerManagement
    };
  }

  /**
   * Update business customer management settings
   */
  async updateBusinessCustomerManagementSettings(
    businessId: string, 
    settings: Partial<CustomerManagementSettings>
  ): Promise<CustomerManagementSettings> {
    const business = await this.businessRepository.findById(businessId);
    
    if (!business) {
      throw new Error('Business not found');
    }

    const currentSettings = business.settings as Record<string, unknown> || {};
    const currentCustomerManagement = currentSettings.customerManagement as CustomerManagementSettings || DEFAULT_CUSTOMER_MANAGEMENT_SETTINGS;

    const updatedCustomerManagement = {
      ...currentCustomerManagement,
      ...settings
    };

    const updatedSettings = {
      ...currentSettings,
      customerManagement: updatedCustomerManagement
    };

    await this.businessRepository.update(businessId, {
      settings: updatedSettings
    });

    return updatedCustomerManagement;
  }

  /**
   * Get customer notes for a specific customer
   */
  async getCustomerNotes(
    businessId: string,
    customerId: string,
    noteType?: 'STAFF' | 'INTERNAL' | 'CUSTOMER'
  ): Promise<CustomerNote[]> {
    const whereClause: any = {
      businessId,
      customerId
    };

    if (noteType) {
      whereClause.noteType = noteType;
    }

    const notes = await this.prisma.customerNote.findMany({
      where: whereClause,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return notes.map((note: any) => ({
      id: note.id,
      customerId: note.customerId,
      businessId: note.businessId,
      authorId: note.authorId,
      noteType: note.noteType as 'STAFF' | 'INTERNAL' | 'CUSTOMER',
      content: note.content,
      isPrivate: note.isPrivate,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      author: note.author ? {
        id: note.author.id,
        firstName: note.author.firstName || '',
        lastName: note.author.lastName || '',
        role: 'STAFF' // TODO: Get actual role from business staff
      } : undefined
    }));
  }

  /**
   * Add a note to a customer
   */
  async addCustomerNote(
    businessId: string,
    customerId: string,
    authorId: string,
    noteData: {
      content: string;
      noteType: 'STAFF' | 'INTERNAL' | 'CUSTOMER';
      isPrivate?: boolean;
    }
  ): Promise<CustomerNote> {
    // Check if customer management settings allow this note type
    const settings = await this.getBusinessCustomerManagementSettings(businessId);
    
    if (noteData.noteType === 'STAFF' && !settings.customerNotes.allowStaffNotes) {
      throw new Error('Staff notes are not enabled for this business');
    }
    
    if (noteData.noteType === 'INTERNAL' && !settings.customerNotes.allowInternalNotes) {
      throw new Error('Internal notes are not enabled for this business');
    }

    // Validate note length
    if (noteData.content.length > settings.customerNotes.maxNoteLength) {
      throw new Error(`Note content exceeds maximum length of ${settings.customerNotes.maxNoteLength} characters`);
    }

    const note = await this.prisma.customerNote.create({
      data: {
        id: `cn_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        businessId,
        customerId,
        authorId,
        noteType: noteData.noteType,
        content: noteData.content,
        isPrivate: noteData.isPrivate || false
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    return {
      id: note.id,
      customerId: note.customerId,
      businessId: note.businessId,
      authorId: note.authorId,
      noteType: note.noteType as 'STAFF' | 'INTERNAL' | 'CUSTOMER',
      content: note.content,
      isPrivate: note.isPrivate,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      author: note.author ? {
        id: note.author.id,
        firstName: note.author.firstName || '',
        lastName: note.author.lastName || '',
        role: 'STAFF'
      } : undefined
    };
  }

  /**
   * Get customer loyalty status
   */
  async getCustomerLoyaltyStatus(
    businessId: string,
    customerId: string
  ): Promise<CustomerLoyaltyStatus | null> {
    const settings = await this.getBusinessCustomerManagementSettings(businessId);
    
    if (!settings.loyaltyProgram.enabled) {
      return null;
    }

    // Get customer appointment count
    const appointmentCount = await this.prisma.appointment.count({
      where: {
        businessId,
        customerId,
        status: {
          in: ['CONFIRMED', 'COMPLETED']
        }
      }
    });

    const isLoyaltyMember = appointmentCount >= settings.loyaltyProgram.appointmentThreshold;
    
    // Determine loyalty tier
    let loyaltyTier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' = 'BRONZE';
    if (appointmentCount >= 50) loyaltyTier = 'PLATINUM';
    else if (appointmentCount >= 25) loyaltyTier = 'GOLD';
    else if (appointmentCount >= 10) loyaltyTier = 'SILVER';

    const nextTierAppointments = loyaltyTier === 'PLATINUM' ? 0 : 
      loyaltyTier === 'GOLD' ? 50 - appointmentCount :
      loyaltyTier === 'SILVER' ? 25 - appointmentCount :
      10 - appointmentCount;

    const benefits = this.getLoyaltyBenefits(loyaltyTier);

    return {
      customerId,
      businessId,
      totalAppointments: appointmentCount,
      isLoyaltyMember,
      loyaltyTier,
      nextTierAppointments: Math.max(0, nextTierAppointments),
      benefits,
      joinedAt: new Date() // TODO: Get actual join date
    };
  }

  /**
   * Check if customer is active based on business settings
   */
  async isCustomerActive(
    businessId: string,
    customerId: string
  ): Promise<boolean> {
    const settings = await this.getBusinessCustomerManagementSettings(businessId);
    
    if (!settings.activeCustomerDefinition.enabled) {
      return true; // If not enabled, consider all customers active
    }

    const monthsAgo = new Date();
    monthsAgo.setMonth(monthsAgo.getMonth() - settings.activeCustomerDefinition.monthsThreshold);

    const recentAppointment = await this.prisma.appointment.findFirst({
      where: {
        businessId,
        customerId,
        status: {
          in: ['CONFIRMED', 'COMPLETED']
        },
        startTime: {
          gte: monthsAgo
        }
      },
      orderBy: { startTime: 'desc' }
    });

    return !!recentAppointment;
  }

  /**
   * Get customer evaluation for an appointment
   */
  async getCustomerEvaluation(
    businessId: string,
    appointmentId: string
  ): Promise<CustomerEvaluation | null> {
    const evaluation = await this.prisma.customerEvaluation.findFirst({
      where: {
        businessId,
        appointmentId
      },
      include: {
        answers: {
          include: {
            question: true
          }
        }
      }
    });

    if (!evaluation) return null;

    return {
      id: evaluation.id,
      customerId: evaluation.customerId,
      businessId: evaluation.businessId,
      appointmentId: evaluation.appointmentId,
      rating: evaluation.rating,
      comment: evaluation.comment || undefined,
      answers: evaluation.answers.map((answer: any) => ({
        questionId: answer.questionId,
        answer: answer.answer,
        question: answer.question ? {
          id: answer.question.id,
          question: answer.question.question,
          type: answer.question.type as 'RATING' | 'TEXT' | 'CHOICE',
          required: answer.question.required,
          options: answer.question.options as string[] | undefined,
          minRating: answer.question.minRating || undefined,
          maxRating: answer.question.maxRating || undefined
        } : undefined
      })),
      isAnonymous: evaluation.isAnonymous,
      createdAt: evaluation.createdAt,
      updatedAt: evaluation.updatedAt
    };
  }

  /**
   * Submit customer evaluation
   */
  async submitCustomerEvaluation(
    businessId: string,
    appointmentId: string,
    evaluationData: {
      customerId: string;
      rating: number;
      comment?: string;
      answers: Array<{
        questionId: string;
        answer: string | number;
      }>;
      isAnonymous?: boolean;
    }
  ): Promise<CustomerEvaluation> {
    const settings = await this.getBusinessCustomerManagementSettings(businessId);
    
    if (!settings.customerEvaluations.enabled) {
      throw new Error('Customer evaluations are not enabled for this business');
    }

    // Validate required questions
    const requiredQuestions = settings.customerEvaluations.questions?.filter(q => q.required) || [];
    const answeredQuestionIds = evaluationData.answers.map(a => a.questionId);
    
    for (const requiredQuestion of requiredQuestions) {
      if (!answeredQuestionIds.includes(requiredQuestion.id)) {
        throw new Error(`Required question "${requiredQuestion.question}" was not answered`);
      }
    }

    const evaluation = await this.prisma.customerEvaluation.create({
      data: {
        id: `ce_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        businessId,
        customerId: evaluationData.customerId,
        appointmentId,
        rating: evaluationData.rating,
        comment: evaluationData.comment,
        isAnonymous: evaluationData.isAnonymous || false,
        answers: {
          create: evaluationData.answers.map(answer => ({
            id: `cea_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
            questionId: answer.questionId,
            answer: answer.answer.toString()
          }))
        }
      },
      include: {
        answers: {
          include: {
            question: true
          }
        }
      }
    });

    return {
      id: evaluation.id,
      customerId: evaluation.customerId,
      businessId: evaluation.businessId,
      appointmentId: evaluation.appointmentId,
      rating: evaluation.rating,
      comment: evaluation.comment || undefined,
      answers: evaluation.answers.map((answer: any) => ({
        questionId: answer.questionId,
        answer: answer.answer,
        question: answer.question ? {
          id: answer.question.id,
          question: answer.question.question,
          type: answer.question.type as 'RATING' | 'TEXT' | 'CHOICE',
          required: answer.question.required,
          options: answer.question.options as string[] | undefined,
          minRating: answer.question.minRating || undefined,
          maxRating: answer.question.maxRating || undefined
        } : undefined
      })),
      isAnonymous: evaluation.isAnonymous,
      createdAt: evaluation.createdAt,
      updatedAt: evaluation.updatedAt
    };
  }

  /**
   * Get loyalty benefits based on tier
   */
  private getLoyaltyBenefits(tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'): string[] {
    const benefits = {
      BRONZE: ['Priority customer support'],
      SILVER: ['Priority customer support', '5% discount on services', 'Free consultation'],
      GOLD: ['Priority customer support', '10% discount on services', 'Free consultation', 'Exclusive offers'],
      PLATINUM: ['Priority customer support', '15% discount on services', 'Free consultation', 'Exclusive offers', 'VIP treatment', 'Free birthday service']
    };

    return benefits[tier];
  }
}
