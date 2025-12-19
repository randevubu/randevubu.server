import { ServiceContainer } from '../services';
import { RepositoryContainer } from '../repositories';
import { ResponseHelper } from '../utils/responseHelper';
import { BusinessTypeController } from './businessTypeController';
import { ServiceController } from './serviceController';
import { AppointmentController } from './appointmentController';
import { DiscountCodeController } from './discountCodeController';
import { ContactController } from './contactController';
import { SecureNotificationController } from './secureNotificationController';
import { UserBehaviorController } from './userBehaviorController';
import { RoleController } from './roleController';
import { UsageController } from './usageController';
import { StaffController } from './staffController';
import { DailyNotebookController } from './dailyNotebookController';
import { BusinessController } from './businessController';
import { BusinessClosureController } from './businessClosureController';
import { SubscriptionController } from './subscriptionController';
import { PushNotificationController } from './pushNotificationController';
import { PaymentMethodController } from './paymentMethodController';
import { RatingController } from './ratingController';
import { ReportsController } from './reportsController';
import { PaymentController } from './paymentController';
// New business-related controllers (refactored from businessController)
import { BusinessHoursController } from './businessHoursController';
import { BusinessImageController } from './businessImageController';
import { BusinessSettingsController } from './businessSettingsController';
import { BusinessNotificationController } from './businessNotificationController';
import { CancellationPolicyController } from './cancellationPolicyController';
import { CustomerManagementController } from './customerManagementController';
import { GoogleIntegrationController } from './googleIntegrationController';

// Controller container for dependency injection
export class ControllerContainer {
  public readonly businessTypeController: BusinessTypeController;
  public readonly serviceController: ServiceController;
  public readonly appointmentController: AppointmentController;
  public readonly userBehaviorController: UserBehaviorController;
  public readonly roleController: RoleController;
  public readonly discountCodeController: DiscountCodeController;
  public readonly usageController: UsageController;
  public readonly staffController: StaffController;
  public readonly dailyNotebookController: DailyNotebookController;
  public readonly contactController: ContactController;
  public readonly secureNotificationController?: SecureNotificationController;
  public readonly businessController: BusinessController;
  public readonly businessClosureController: BusinessClosureController;
  public readonly subscriptionController: SubscriptionController;
  public readonly pushNotificationController: PushNotificationController;
  public readonly paymentMethodController: PaymentMethodController;
  public readonly ratingController: RatingController;
  public readonly reportsController: ReportsController;
  public readonly paymentController: PaymentController;
  // New business-related controllers
  public readonly businessHoursController: BusinessHoursController;
  public readonly businessImageController: BusinessImageController;
  public readonly businessSettingsController: BusinessSettingsController;
  public readonly businessNotificationController: BusinessNotificationController;
  public readonly cancellationPolicyController: CancellationPolicyController;
  public readonly customerManagementController: CustomerManagementController;
  public readonly googleIntegrationController: GoogleIntegrationController;

  constructor(repositories: RepositoryContainer, services: ServiceContainer) {
    // Create a single ResponseHelper instance with TranslationService
    const responseHelper = new ResponseHelper(services.translationService);

    this.businessTypeController = new BusinessTypeController(
      services.businessTypeService,
      responseHelper
    );
    this.serviceController = new ServiceController(services.offeringService, responseHelper);
    this.appointmentController = new AppointmentController(
      services.appointmentService,
      responseHelper
    );
    this.userBehaviorController = new UserBehaviorController(
      services.userBehaviorService,
      responseHelper
    );
    this.roleController = new RoleController(services.roleService, responseHelper);
    this.discountCodeController = new DiscountCodeController(
      services.discountCodeService,
      responseHelper
    );
    this.usageController = new UsageController(services.usageService, responseHelper);
    this.staffController = new StaffController(services.staffService, responseHelper);
    this.dailyNotebookController = new DailyNotebookController(
      services.dailyNotebookService,
      responseHelper
    );
    this.contactController = new ContactController(responseHelper);
    // TODO: Add SecureNotificationService to ServiceContainer before enabling this
    // this.secureNotificationController = new SecureNotificationController(
    //   services.secureNotificationService,
    //   responseHelper
    // );
    this.businessController = new BusinessController(
      services.businessService,
      responseHelper,
      services.tokenService,
      services.rbacService
    );
    this.businessClosureController = new BusinessClosureController(
      services.businessClosureService,
      services.notificationService,
      services.closureAnalyticsService,
      services.appointmentRescheduleService
    );
    this.subscriptionController = new SubscriptionController(
      services.subscriptionService,
      responseHelper
    );
    this.pushNotificationController = new PushNotificationController(
      services.notificationService,
      responseHelper
    );
    this.paymentMethodController = new PaymentMethodController(
      services.paymentService,
      services.subscriptionService,
      services.rbacService,
      responseHelper
    );
    this.ratingController = new RatingController(services.ratingService, responseHelper);
    this.reportsController = new ReportsController(services.reportsService, responseHelper);
    this.paymentController = new PaymentController(
      services.paymentService,
      services.subscriptionService,
      responseHelper
    );

    // Initialize new business-related controllers
    this.businessHoursController = new BusinessHoursController(
      services.businessService,
      responseHelper
    );
    this.businessImageController = new BusinessImageController(
      services.businessService,
      responseHelper
    );
    this.businessSettingsController = new BusinessSettingsController(
      services.businessService,
      responseHelper
    );
    this.businessNotificationController = new BusinessNotificationController(
      services.businessService,
      responseHelper,
      services.rbacService,
      services.notificationService
    );
    this.cancellationPolicyController = new CancellationPolicyController(
      services.businessService,
      responseHelper
    );
    this.customerManagementController = new CustomerManagementController(
      services.businessService,
      responseHelper
    );
    this.googleIntegrationController = new GoogleIntegrationController(
      services.businessService,
      responseHelper
    );
  }
}

// Export individual controllers
export {
  BusinessTypeController,
  ServiceController,
  AppointmentController,
  UserBehaviorController,
  RoleController,
  DiscountCodeController,
  UsageController,
  StaffController,
  DailyNotebookController,
  ContactController,
  SecureNotificationController,
  BusinessController,
  BusinessClosureController,
  SubscriptionController,
  PushNotificationController,
  PaymentMethodController,
  RatingController,
  ReportsController,
  PaymentController,
  // New business-related controllers
  BusinessHoursController,
  BusinessImageController,
  BusinessSettingsController,
  BusinessNotificationController,
  CancellationPolicyController,
  CustomerManagementController,
  GoogleIntegrationController,
};
