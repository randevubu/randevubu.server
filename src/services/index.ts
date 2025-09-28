import { PrismaClient } from '@prisma/client';
import { RepositoryContainer } from '../repositories';
import { RoleRepository } from '../repositories/roleRepository';
import { AuthService } from './authService';
import { PhoneVerificationService } from './phoneVerificationService';
import { TokenService } from './tokenService';
import { RBACService } from './rbacService';
import { RoleService } from './roleService';
import { BusinessService } from './businessService';
import { BusinessTypeService } from './businessTypeService';
import { ServiceService } from './serviceService';
import { AppointmentService } from './appointmentService';
import { UserBehaviorService } from './userBehaviorService';
import { BusinessClosureService } from './businessClosureService';
import { SubscriptionService } from './subscriptionService';
import { PaymentService } from './paymentService';
import { NotificationService } from './notificationService';
import { ClosureAnalyticsService } from './closureAnalyticsService';
import { AppointmentRescheduleService } from './appointmentRescheduleService';
import { DiscountCodeService } from './discountCodeService';
import { UsageService } from './usageService';
import { SubscriptionSchedulerService } from './subscriptionSchedulerService';
import { AppointmentSchedulerService } from './appointmentSchedulerService';
import { StaffService } from './staffService';
import { AppointmentReminderService } from './appointmentReminderService';

// Service container for dependency injection
export class ServiceContainer {
  public readonly authService: AuthService;
  public readonly phoneVerificationService: PhoneVerificationService;
  public readonly tokenService: TokenService;
  public readonly rbacService: RBACService;
  public readonly roleService: RoleService;
  public readonly roleRepository: RoleRepository;
  public readonly businessService: BusinessService;
  public readonly businessTypeService: BusinessTypeService;
  public readonly serviceService: ServiceService;
  public readonly appointmentService: AppointmentService;
  public readonly userBehaviorService: UserBehaviorService;
  public readonly businessClosureService: BusinessClosureService;
  public readonly subscriptionService: SubscriptionService;
  public readonly paymentService: PaymentService;
  public readonly notificationService: NotificationService;
  public readonly closureAnalyticsService: ClosureAnalyticsService;
  public readonly appointmentRescheduleService: AppointmentRescheduleService;
  public readonly discountCodeService: DiscountCodeService;
  public readonly usageService: UsageService;
  public readonly subscriptionSchedulerService: SubscriptionSchedulerService;
  public readonly appointmentSchedulerService: AppointmentSchedulerService;
  public readonly staffService: StaffService;
  public readonly appointmentReminderService: AppointmentReminderService;

  constructor(repositories: RepositoryContainer, private prisma: PrismaClient) {
    this.tokenService = new TokenService(repositories);
    this.phoneVerificationService = new PhoneVerificationService(repositories, this.tokenService);
    
    // RBAC services
    this.roleRepository = repositories.roleRepository;
    this.rbacService = new RBACService(repositories);
    this.roleService = new RoleService(this.roleRepository, this.rbacService);
    
    // Auth service with RBAC support
    this.authService = new AuthService(repositories, this.phoneVerificationService, this.tokenService, this.rbacService);

    // Business type service
    this.businessTypeService = new BusinessTypeService(repositories.businessTypeRepository);

    // Usage tracking service (needed for multiple services)
    this.usageService = new UsageService(
      repositories.usageRepository,
      this.rbacService,
      this.prisma
    );

    // Business services (needs usage service for staff counting)
    this.businessService = new BusinessService(repositories.businessRepository, this.rbacService, this.prisma, this.usageService);

    // Create services that depend on usage service
    this.serviceService = new ServiceService(repositories.serviceRepository, repositories.businessRepository, this.rbacService, this.usageService);

    // Create notification service first for appointment service dependency
    this.notificationService = new NotificationService(repositories.prismaClient, this.usageService);

    this.appointmentService = new AppointmentService(
      repositories.appointmentRepository,
      repositories.serviceRepository,
      repositories.userBehaviorRepository,
      repositories.businessClosureRepository,
      this.rbacService,
      this.businessService,
      this.notificationService,
      this.usageService,
      repositories
    );
    this.userBehaviorService = new UserBehaviorService(repositories.userBehaviorRepository, this.rbacService);
    this.businessClosureService = new BusinessClosureService(
      repositories.businessClosureRepository,
      repositories.appointmentRepository,
      this.rbacService
    );
    // Create discount code service first
    this.discountCodeService = new DiscountCodeService(
      repositories.discountCodeRepository,
      this.rbacService
    );

    // Then create payment service with discount code service dependency
    this.paymentService = new PaymentService(repositories.prismaClient, this.discountCodeService);

    // Create subscription service with payment service dependency
    this.subscriptionService = new SubscriptionService(repositories.subscriptionRepository, this.rbacService, this.paymentService);

    // Enhanced closure services
    this.closureAnalyticsService = new ClosureAnalyticsService(repositories.prismaClient);
    this.appointmentRescheduleService = new AppointmentRescheduleService(
      repositories.prismaClient,
      this.notificationService
    );


    // Subscription scheduler service
    this.subscriptionSchedulerService = new SubscriptionSchedulerService(
      this.prisma,
      this.paymentService,
      this.notificationService
    );

    // Appointment scheduler service
    this.appointmentSchedulerService = new AppointmentSchedulerService(
      this.prisma
    );

    // Staff management service
    this.staffService = new StaffService(
      repositories,
      this.phoneVerificationService,
      this.rbacService,
      this.usageService
    );

    // Appointment reminder service
    this.appointmentReminderService = new AppointmentReminderService(
      this.prisma,
      this.notificationService,
      this.appointmentService,
      this.businessService
    );
  }
}

// Export individual services
export {
  AuthService,
  PhoneVerificationService,
  TokenService,
  RBACService,
  RoleService,
  BusinessService,
  BusinessTypeService,
  ServiceService,
  AppointmentService,
  UserBehaviorService,
  BusinessClosureService,
  SubscriptionService,
  PaymentService,
  NotificationService,
  ClosureAnalyticsService,
  AppointmentRescheduleService,
  DiscountCodeService,
  UsageService,
  SubscriptionSchedulerService,
  AppointmentSchedulerService,
  StaffService,
  AppointmentReminderService
};