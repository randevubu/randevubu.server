import { PrismaClient } from '@prisma/client';
import { RepositoryContainer } from '../repositories';
import { RoleRepository } from '../repositories/roleRepository';
// Import services from domain folders
import { AuthService } from './domain/auth';
import { PhoneVerificationService } from './domain/sms';
import { TokenService } from './domain/token';
import { RBACService } from './domain/rbac';
import { RoleService } from './domain/staff';
import { BusinessService } from './domain/business';
import { BusinessTypeService, OfferingService } from './domain/offering';
import { AppointmentService, AppointmentSchedulerService, AppointmentRescheduleService, AppointmentReminderService } from './domain/appointment';
import { UserBehaviorService } from './domain/userBehavior';
import { BusinessClosureService, ClosureAnalyticsService } from './domain/closure';
import { SubscriptionService, SubscriptionSchedulerService } from './domain/subscription';
import { PaymentService } from './domain/payment';
import { PaymentRetryService } from './domain/payment/paymentRetryService';
import { NotificationService } from './domain/notification';
import { DiscountCodeService } from './domain/discount';
import { UsageService } from './domain/usage';
import { StaffService } from './domain/staff';
import { PricingTierService } from './domain/pricing/pricingTierService';
import { IPGeolocationService } from './domain/geolocation/ipGeolocationService';
import { DailyNotebookService } from './domain/dailyNotebook';
// Import shared services
import { 
  ErrorHandlingService, 
  errorHandlingService,
  SecureLoggingService, 
  secureLoggingService,
  ValidationService, 
  createValidationService 
} from './domain/shared';
import { StartupService } from './startupService';

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
  public readonly offeringService: OfferingService;
  public readonly appointmentService: AppointmentService;
  public readonly userBehaviorService: UserBehaviorService;
  public readonly businessClosureService: BusinessClosureService;
  public readonly subscriptionService: SubscriptionService;
  public readonly paymentService: PaymentService;
  public readonly paymentRetryService: PaymentRetryService;
  public readonly notificationService: NotificationService;
  public readonly closureAnalyticsService: ClosureAnalyticsService;
  public readonly appointmentRescheduleService: AppointmentRescheduleService;
  public readonly discountCodeService: DiscountCodeService;
  public readonly usageService: UsageService;
  public readonly subscriptionSchedulerService: SubscriptionSchedulerService;
  public readonly appointmentSchedulerService: AppointmentSchedulerService;
  public readonly staffService: StaffService;
  public readonly appointmentReminderService: AppointmentReminderService;
  public readonly startupService: StartupService;
  public readonly pricingTierService: PricingTierService;
  public readonly dailyNotebookService: DailyNotebookService;
  
  // Shared services
  public readonly errorHandlingService: ErrorHandlingService;
  public readonly secureLoggingService: SecureLoggingService;
  public readonly validationService: ValidationService;

  constructor(repositories: RepositoryContainer, public readonly prisma: PrismaClient) {
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
      repositories
    );

    // Business services (needs usage service for staff counting)
    this.businessService = new BusinessService(repositories.businessRepository, this.rbacService, repositories, this.usageService);

    // Create services that depend on usage service
    this.offeringService = new OfferingService(repositories.serviceRepository, repositories.businessRepository, this.rbacService, this.usageService);

    // Create notification service first for appointment service dependency
    this.notificationService = new NotificationService(repositories, this.usageService);

    this.appointmentService = new AppointmentService(
      repositories.appointmentRepository,
      repositories.serviceRepository,
      repositories.userBehaviorRepository,
      repositories.businessClosureRepository,
      repositories.businessRepository,
      this.rbacService,
      this.businessService,
      this.notificationService,
      this.usageService,
      repositories,
      this.prisma
    );
    this.userBehaviorService = new UserBehaviorService(repositories.userBehaviorRepository, this.rbacService);
    this.businessClosureService = new BusinessClosureService(
      repositories.businessClosureRepository,
      repositories.appointmentRepository,
      this.rbacService
    );
    // Create pricing tier service first
    this.pricingTierService = new PricingTierService(this.prisma);
    
    // Create discount code service first
    this.discountCodeService = new DiscountCodeService(
      repositories.discountCodeRepository,
      this.rbacService
    );
    
    this.subscriptionService = new SubscriptionService(repositories.subscriptionRepository, this.rbacService, this.pricingTierService, this.discountCodeService);
    
    // Then create payment service with discount code service dependency
    this.paymentService = new PaymentService(repositories, {
      validateDiscountCode: this.discountCodeService.validateDiscountCode.bind(this.discountCodeService),
      applyDiscountCode: async (code, userId, planId, originalAmount, subscriptionId, paymentId) => {
        await this.discountCodeService.applyDiscountCode(code, userId, planId, originalAmount, subscriptionId, paymentId);
      },
      applyPendingDiscount: this.discountCodeService.applyPendingDiscount.bind(this.discountCodeService),
      canApplyToPayment: this.discountCodeService.canApplyToPayment.bind(this.discountCodeService)
    });

    // Create payment retry service
    this.paymentRetryService = new PaymentRetryService(
      this.prisma,
      this.paymentService,
      this.notificationService,
      {
        maxRetries: 5,
        retrySchedule: [0, 1, 3, 7, 14], // Immediate, 1 day, 3 days, 1 week, 2 weeks
        escalationThreshold: 3,
        gracePeriodDays: 30
      }
    );

    // Enhanced closure services
    this.closureAnalyticsService = new ClosureAnalyticsService(this.prisma);
    this.appointmentRescheduleService = new AppointmentRescheduleService(
      this.prisma,
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

    // Startup service
    this.startupService = new StartupService(this.prisma);
    
    // Daily Notebook service
    this.dailyNotebookService = new DailyNotebookService(repositories.dailyNotebookRepository);
    
    // Shared services
    this.errorHandlingService = errorHandlingService;
    this.secureLoggingService = secureLoggingService;
    this.validationService = createValidationService(this.prisma, repositories);
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
  OfferingService,
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
  AppointmentReminderService,
  StartupService,
  PricingTierService,
  IPGeolocationService,
  DailyNotebookService,
  // Shared services
  ErrorHandlingService,
  errorHandlingService,
  SecureLoggingService,
  secureLoggingService,
  ValidationService,
  createValidationService
};