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
import { AppointmentService, AppointmentRescheduleService } from './domain/appointment';
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
import { RatingService } from './domain/rating/ratingService';
import { ReportsService } from './domain/reports/reportsService';
import { CancellationPolicyService } from './domain/business/cancellationPolicyService';
import { UnifiedNotificationGateway } from './domain/notification/unifiedNotificationGateway';
// Import shared services
import {
  ErrorHandlingService,
  errorHandlingService,
  SecureLoggingService,
  secureLoggingService,
  ValidationService,
  createValidationService,
} from './domain/shared';
import { StartupService } from './core/startupService';
import { TranslationService } from './core/translationService';
import { CacheService } from './core/cacheService';
import { cacheManager } from '../lib/redis/redis';
import { CacheStampedeProtection } from '../lib/cache/cacheStampede';
import Logger from '../utils/Logger/logger';

// Import job infrastructure
import { JobScheduler, jobMetrics } from '../jobs/base';
import { AutoCompleteAppointmentsJob, SendAppointmentRemindersJob } from '../jobs/appointment';

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
  public readonly staffService: StaffService;
  public readonly startupService: StartupService;
  public readonly pricingTierService: PricingTierService;
  public readonly dailyNotebookService: DailyNotebookService;
  public readonly translationService: TranslationService;
  public readonly cacheService: CacheService;
  public readonly ratingService: RatingService;
  public readonly reportsService: ReportsService;

  // Job scheduler
  public readonly jobScheduler: JobScheduler;

  // Shared services
  public readonly errorHandlingService: ErrorHandlingService;
  public readonly secureLoggingService: SecureLoggingService;
  public readonly validationService: ValidationService;

  constructor(
    repositories: RepositoryContainer,
    public readonly prisma: PrismaClient
  ) {
    // Core infrastructure services (needed by other services)
    // Cache service with DI
    this.cacheService = new CacheService(cacheManager, Logger, CacheStampedeProtection);

    this.tokenService = new TokenService(repositories);
    this.phoneVerificationService = new PhoneVerificationService(repositories, this.tokenService);

    // RBAC services
    this.roleRepository = repositories.roleRepository;
    this.rbacService = new RBACService(repositories);
    this.roleService = new RoleService(this.roleRepository, this.rbacService);

    // Auth service with RBAC support
    this.authService = new AuthService(
      repositories,
      this.phoneVerificationService,
      this.tokenService,
      this.rbacService
    );

    // Business type service
    this.businessTypeService = new BusinessTypeService(repositories.businessTypeRepository);

    // Usage tracking service (needed for multiple services)
    this.usageService = new UsageService(
      repositories.usageRepository,
      this.rbacService,
      repositories
    );

    // Business services (needs usage service for staff counting)
    this.businessService = new BusinessService(
      repositories.businessRepository,
      this.rbacService,
      repositories,
      this.usageService
    );

    // Create services that depend on usage service
    this.offeringService = new OfferingService(
      repositories.serviceRepository,
      repositories.businessRepository,
      this.rbacService,
      this.usageService,
      this.cacheService
    );

    // Translation service (needed by notification service)
    this.translationService = new TranslationService();

    // Create notification service with translation service dependency
    this.notificationService = new NotificationService(
      repositories,
      this.translationService,
      this.usageService
    );

    // Create cancellation policy service for appointment service
    const cancellationPolicyService = new CancellationPolicyService(
      repositories.userBehaviorRepository,
      repositories.businessRepository
    );

    // Create unified notification gateway for appointment service
    const unifiedNotificationGateway = new UnifiedNotificationGateway(
      this.prisma,
      repositories,
      this.usageService
    );

    // Create appointment service with all dependencies injected
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
      cancellationPolicyService,
      unifiedNotificationGateway,
      this.prisma
    );
    this.userBehaviorService = new UserBehaviorService(
      repositories.userBehaviorRepository,
      this.rbacService
    );
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

    this.subscriptionService = new SubscriptionService(
      repositories.subscriptionRepository,
      this.rbacService,
      this.pricingTierService,
      this.discountCodeService
    );

    // Then create payment service with discount code service dependency
    this.paymentService = new PaymentService(repositories, {
      validateDiscountCode: this.discountCodeService.validateDiscountCode.bind(
        this.discountCodeService
      ),
      applyDiscountCode: async (
        code,
        userId,
        planId,
        originalAmount,
        subscriptionId,
        paymentId
      ) => {
        await this.discountCodeService.applyDiscountCode(
          code,
          userId,
          planId,
          originalAmount,
          subscriptionId,
          paymentId
        );
      },
      applyPendingDiscount: this.discountCodeService.applyPendingDiscount.bind(
        this.discountCodeService
      ),
      canApplyToPayment: this.discountCodeService.canApplyToPayment.bind(this.discountCodeService),
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
        gracePeriodDays: 30,
      }
    );

    // Enhanced closure services
    this.closureAnalyticsService = new ClosureAnalyticsService(this.prisma);
    this.appointmentRescheduleService = new AppointmentRescheduleService(
      repositories.businessRepository,
      repositories.appointmentRepository,
      repositories.businessClosureRepository,
      repositories.serviceRepository,
      repositories.workingHoursRepository,
      repositories.rescheduleSuggestionRepository,
      this.notificationService
    );

    // Subscription scheduler service
    this.subscriptionSchedulerService = new SubscriptionSchedulerService(
      this.prisma,
      this.paymentService,
      this.notificationService
    );

    // Staff management service
    this.staffService = new StaffService(
      repositories,
      this.phoneVerificationService,
      this.rbacService,
      this.usageService
    );

    // Startup service
    this.startupService = new StartupService(this.prisma);

    // Daily Notebook service
    this.dailyNotebookService = new DailyNotebookService(repositories.dailyNotebookRepository);

    // Rating service
    this.ratingService = new RatingService(
      repositories.ratingRepository,
      repositories.businessRepository
    );

    // Reports service
    this.reportsService = new ReportsService(repositories);

    // Shared services
    this.errorHandlingService = errorHandlingService;
    this.secureLoggingService = secureLoggingService;
    this.validationService = createValidationService(this.prisma, repositories);

    // ============================================================================
    // Initialize Job Scheduler
    // ============================================================================
    this.jobScheduler = new JobScheduler();

    // Register appointment auto-complete job
    const autoCompleteJob = new AutoCompleteAppointmentsJob(repositories.appointmentRepository);

    const isDevelopment = process.env.NODE_ENV === 'development';
    this.jobScheduler.register(autoCompleteJob, {
      schedule: isDevelopment ? '*/1 * * * *' : '*/5 * * * *', // Every 1 min in dev, 5 min in prod
      timezone: 'Europe/Istanbul',
      enabled: true,
    });

    // Register appointment reminder job
    const reminderJob = new SendAppointmentRemindersJob(
      repositories.appointmentRepository,
      this.notificationService,
      this.appointmentService,
      this.businessService
    );

    this.jobScheduler.register(reminderJob, {
      schedule: '* * * * *', // Every minute
      timezone: 'Europe/Istanbul',
      enabled: true,
    });
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
  StaffService,
  StartupService,
  PricingTierService,
  IPGeolocationService,
  DailyNotebookService,
  TranslationService,
  // Shared services
  ErrorHandlingService,
  errorHandlingService,
  SecureLoggingService,
  secureLoggingService,
  ValidationService,
  createValidationService,
  // Core services
  CacheService,
  RatingService,
  ReportsService,
};
