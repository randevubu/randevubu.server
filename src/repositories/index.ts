import { PrismaClient } from '@prisma/client';
import { PrismaUserRepository } from './userRepository';
import { PrismaPhoneVerificationRepository } from './phoneVerificationRepository';
import { PrismaRefreshTokenRepository } from './refreshTokenRepository';
import { PrismaAuditLogRepository } from './auditLogRepository';
import { BusinessRepository } from './businessRepository';
import { BusinessTypeRepository } from './businessTypeRepository';
import { ServiceRepository } from './serviceRepository';
import { AppointmentRepository } from './appointmentRepository';
import { UserBehaviorRepository } from './userBehaviorRepository';
import { BusinessClosureRepository } from './businessClosureRepository';
import { SubscriptionRepository } from './subscriptionRepository';
import { RoleRepository } from './roleRepository';
import { DiscountCodeRepository } from './discountCodeRepository';
import { UsageRepository } from './usageRepository';
import { StaffRepository } from './staffRepository';
import { PaymentRepository } from './paymentRepository';
import { BusinessNotificationSettingsRepository } from './businessNotificationSettingsRepository';
import { NotificationRepository } from './notificationRepository';
import { DailyNotebookRepository } from './dailyNotebookRepository';

// Repository container for dependency injection
export class RepositoryContainer {
  public readonly userRepository: PrismaUserRepository;
  public readonly phoneVerificationRepository: PrismaPhoneVerificationRepository;
  public readonly refreshTokenRepository: PrismaRefreshTokenRepository;
  public readonly auditLogRepository: PrismaAuditLogRepository;
  public readonly businessRepository: BusinessRepository;
  public readonly businessTypeRepository: BusinessTypeRepository;
  public readonly serviceRepository: ServiceRepository;
  public readonly appointmentRepository: AppointmentRepository;
  public readonly userBehaviorRepository: UserBehaviorRepository;
  public readonly businessClosureRepository: BusinessClosureRepository;
  public readonly subscriptionRepository: SubscriptionRepository;
  public readonly roleRepository: RoleRepository;
  public readonly discountCodeRepository: DiscountCodeRepository;
  public readonly usageRepository: UsageRepository;
  public readonly staffRepository: StaffRepository;
  public readonly paymentRepository: PaymentRepository;
  public readonly businessNotificationSettingsRepository: BusinessNotificationSettingsRepository;
  public readonly notificationRepository: NotificationRepository;
  public readonly dailyNotebookRepository: DailyNotebookRepository;

  constructor(private prisma: PrismaClient) {
    this.userRepository = new PrismaUserRepository(prisma);
    this.phoneVerificationRepository = new PrismaPhoneVerificationRepository(prisma);
    this.refreshTokenRepository = new PrismaRefreshTokenRepository(prisma);
    this.auditLogRepository = new PrismaAuditLogRepository(prisma);
    this.businessRepository = new BusinessRepository(prisma);
    this.businessTypeRepository = new BusinessTypeRepository(prisma);
    this.serviceRepository = new ServiceRepository(prisma);
    this.appointmentRepository = new AppointmentRepository(prisma);
    this.userBehaviorRepository = new UserBehaviorRepository(prisma);
    this.businessClosureRepository = new BusinessClosureRepository(prisma);
    this.subscriptionRepository = new SubscriptionRepository(prisma);
    this.roleRepository = new RoleRepository(prisma);
    this.discountCodeRepository = new DiscountCodeRepository(prisma);
    this.usageRepository = new UsageRepository(prisma);
    this.staffRepository = new StaffRepository(prisma);
    this.paymentRepository = new PaymentRepository(prisma);
    this.businessNotificationSettingsRepository = new BusinessNotificationSettingsRepository(prisma);
    this.notificationRepository = new NotificationRepository(prisma);
    this.dailyNotebookRepository = new DailyNotebookRepository(prisma);
  }

  get prismaClient(): PrismaClient {
    return this.prisma;
  }
}

// Export repository implementations
export {
  PrismaUserRepository,
  PrismaPhoneVerificationRepository, 
  PrismaRefreshTokenRepository,
  PrismaAuditLogRepository,
  BusinessRepository,
  BusinessTypeRepository,
  ServiceRepository,
  AppointmentRepository,
  UserBehaviorRepository,
  BusinessClosureRepository,
  SubscriptionRepository,
  RoleRepository,
  DiscountCodeRepository,
  UsageRepository,
  StaffRepository,
  PaymentRepository,
  BusinessNotificationSettingsRepository,
  NotificationRepository,
  DailyNotebookRepository
};

// Export interfaces for testing/mocking
export type {
  UserRepository,
  PhoneVerificationRepository,
  RefreshTokenRepository,
  AuditLogRepository
} from '../types/auth';