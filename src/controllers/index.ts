import { ServiceContainer } from '../services';
import { RepositoryContainer } from '../repositories';
import { BusinessController } from './businessController';
import { ServiceController } from './serviceController';
import { AppointmentController } from './appointmentController';
import { UserBehaviorController } from './userBehaviorController';
import { BusinessClosureController } from './businessClosureController';
import { SubscriptionController } from './subscriptionController';
import { RoleController } from './roleController';

// Controller container for dependency injection
export class ControllerContainer {
  public readonly businessController: BusinessController;
  public readonly serviceController: ServiceController;
  public readonly appointmentController: AppointmentController;
  public readonly userBehaviorController: UserBehaviorController;
  public readonly businessClosureController: BusinessClosureController;
  public readonly subscriptionController: SubscriptionController;
  public readonly roleController: RoleController;

  constructor(repositories: RepositoryContainer, services: ServiceContainer) {
    this.businessController = new BusinessController(services.businessService);
    this.serviceController = new ServiceController(services.serviceService);
    this.appointmentController = new AppointmentController(services.appointmentService);
    this.userBehaviorController = new UserBehaviorController(services.userBehaviorService);
    this.businessClosureController = new BusinessClosureController(services.businessClosureService);
    this.subscriptionController = new SubscriptionController(services.subscriptionService);
    this.roleController = new RoleController(services.roleService);
  }
}

// Export individual controllers
export {
  BusinessController,
  ServiceController,
  AppointmentController,
  UserBehaviorController,
  BusinessClosureController,
  SubscriptionController,
  RoleController
};