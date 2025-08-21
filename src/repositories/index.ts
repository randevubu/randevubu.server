import { PrismaClient } from '@prisma/client';
import { PrismaUserRepository } from './userRepository';
import { PrismaPhoneVerificationRepository } from './phoneVerificationRepository';
import { PrismaRefreshTokenRepository } from './refreshTokenRepository';
import { PrismaAuditLogRepository } from './auditLogRepository';
import { BusinessRepository } from './businessRepository';
import { ServiceRepository } from './serviceRepository';
import { AppointmentRepository } from './appointmentRepository';
import { UserBehaviorRepository } from './userBehaviorRepository';
import { BusinessClosureRepository } from './businessClosureRepository';
import { SubscriptionRepository } from './subscriptionRepository';
import { RoleRepository } from './roleRepository';

// Repository container for dependency injection
export class RepositoryContainer {
  public readonly userRepository: PrismaUserRepository;
  public readonly phoneVerificationRepository: PrismaPhoneVerificationRepository;
  public readonly refreshTokenRepository: PrismaRefreshTokenRepository;
  public readonly auditLogRepository: PrismaAuditLogRepository;
  public readonly businessRepository: BusinessRepository;
  public readonly serviceRepository: ServiceRepository;
  public readonly appointmentRepository: AppointmentRepository;
  public readonly userBehaviorRepository: UserBehaviorRepository;
  public readonly businessClosureRepository: BusinessClosureRepository;
  public readonly subscriptionRepository: SubscriptionRepository;
  public readonly roleRepository: RoleRepository;

  constructor(private prisma: PrismaClient) {
    this.userRepository = new PrismaUserRepository(prisma);
    this.phoneVerificationRepository = new PrismaPhoneVerificationRepository(prisma);
    this.refreshTokenRepository = new PrismaRefreshTokenRepository(prisma);
    this.auditLogRepository = new PrismaAuditLogRepository(prisma);
    this.businessRepository = new BusinessRepository(prisma);
    this.serviceRepository = new ServiceRepository(prisma);
    this.appointmentRepository = new AppointmentRepository(prisma);
    this.userBehaviorRepository = new UserBehaviorRepository(prisma);
    this.businessClosureRepository = new BusinessClosureRepository(prisma);
    this.subscriptionRepository = new SubscriptionRepository(prisma);
    this.roleRepository = new RoleRepository(prisma);
  }
}

// Export repository implementations
export {
  PrismaUserRepository,
  PrismaPhoneVerificationRepository, 
  PrismaRefreshTokenRepository,
  PrismaAuditLogRepository,
  BusinessRepository,
  ServiceRepository,
  AppointmentRepository,
  UserBehaviorRepository,
  BusinessClosureRepository,
  SubscriptionRepository,
  RoleRepository
};

// Export interfaces for testing/mocking
export type {
  UserRepository,
  PhoneVerificationRepository,
  RefreshTokenRepository,
  AuditLogRepository
} from '../types/auth';