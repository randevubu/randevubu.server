import { PrismaClient, Appointment, AppointmentStatus } from '@prisma/client';
import { CustomerEvaluationData } from '../types/business';

export class RatingRepository {
  constructor(private prisma: PrismaClient) {}

  async canUserRateBusiness(
    userId: string,
    businessId: string,
    appointmentId: string
  ): Promise<{
    canRate: boolean;
    reason?: string;
    appointment?: Appointment;
  }> {
    // Check if appointment exists and belongs to user
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        customerId: userId,
        businessId: businessId,
        status: AppointmentStatus.COMPLETED // Only completed appointments
      }
    });

    if (!appointment) {
      return {
        canRate: false,
        reason: 'Appointment not found, not yours, or not completed'
      };
    }

    // Check if already rated
    const existingRating = await this.prisma.customerEvaluation.findFirst({
      where: { appointmentId }
    });

    if (existingRating) {
      return {
        canRate: false,
        reason: 'You have already rated this appointment',
        appointment
      };
    }

    return {
      canRate: true,
      appointment
    };
  }

  async createRating(data: {
    customerId: string;
    businessId: string;
    appointmentId: string;
    rating: number;
    comment?: string;
    isAnonymous: boolean;
  }): Promise<CustomerEvaluationData> {
    const rating = await this.prisma.customerEvaluation.create({
      data: {
        id: `eval_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        customerId: data.customerId,
        businessId: data.businessId,
        appointmentId: data.appointmentId,
        rating: data.rating,
        comment: data.comment,
        isAnonymous: data.isAnonymous
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    return rating as CustomerEvaluationData;
  }

  async getRatingByAppointmentId(
    appointmentId: string
  ): Promise<CustomerEvaluationData | null> {
    const rating = await this.prisma.customerEvaluation.findFirst({
      where: { appointmentId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    return rating as CustomerEvaluationData | null;
  }

  async getUserRatingsForBusiness(
    userId: string,
    businessId: string
  ): Promise<CustomerEvaluationData[]> {
    const ratings = await this.prisma.customerEvaluation.findMany({
      where: {
        customerId: userId,
        businessId: businessId
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return ratings as CustomerEvaluationData[];
  }
}
