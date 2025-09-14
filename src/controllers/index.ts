import { ServiceContainer } from '../services';
import { RepositoryContainer } from '../repositories';
import { BusinessController } from './businessController';
import { BusinessTypeController } from './businessTypeController';
import { ServiceController } from './serviceController';
import { AppointmentController } from './appointmentController';
import { UserBehaviorController } from './userBehaviorController';
import { BusinessClosureController } from './businessClosureController';
import { SubscriptionController } from './subscriptionController';
import { RoleController } from './roleController';
import { DiscountCodeController } from './discountCodeController';
import { UsageController } from './usageController';
import { StaffController } from './staffController';
import { PushNotificationController } from './pushNotificationController';

// Controller container for dependency injection
export class ControllerContainer {
  public readonly businessController: BusinessController;
  public readonly businessTypeController: BusinessTypeController;
  public readonly serviceController: ServiceController;
  public readonly appointmentController: AppointmentController;
  public readonly userBehaviorController: UserBehaviorController;
  public readonly businessClosureController: BusinessClosureController;
  public readonly subscriptionController: SubscriptionController;
  public readonly roleController: RoleController;
  public readonly discountCodeController: DiscountCodeController;
  public readonly usageController: UsageController;
  public readonly staffController: StaffController;
  public readonly pushNotificationController: PushNotificationController;

  constructor(repositories: RepositoryContainer, services: ServiceContainer) {
    this.businessController = new BusinessController(
      services.businessService,
      services.tokenService,
      services.rbacService,
      services.staffService
    );
    this.businessTypeController = new BusinessTypeController(services.businessTypeService);
    this.serviceController = new ServiceController(services.serviceService);
    this.appointmentController = new AppointmentController(services.appointmentService);
    this.userBehaviorController = new UserBehaviorController(services.userBehaviorService);
    this.businessClosureController = new BusinessClosureController(
      services.businessClosureService,
      services.notificationService,
      services.closureAnalyticsService,
      services.appointmentRescheduleService
    );
    this.subscriptionController = new SubscriptionController(services.subscriptionService);
    this.roleController = new RoleController(services.roleService);
    this.discountCodeController = new DiscountCodeController(services.discountCodeService);
    this.usageController = new UsageController(services.usageService);
    this.staffController = new StaffController(services.staffService);
    this.pushNotificationController = new PushNotificationController(services.notificationService);
  }
}

// Export individual controllers
export {
  BusinessController,
  BusinessTypeController,
  ServiceController,
  AppointmentController,
  UserBehaviorController,
  BusinessClosureController,
  SubscriptionController,
  RoleController,
  DiscountCodeController,
  UsageController,
  StaffController,
  PushNotificationController
};