import { PrismaClient } from '@prisma/client';
import { RepositoryContainer } from '../repositories';
import { RoleRepository } from '../repositories/roleRepository';
import { AuthService } from './authService';
import { PhoneVerificationService } from './phoneVerificationService';
import { TokenService } from './tokenService';
import { RBACService } from './rbacService';
import { RoleService } from './roleService';
import { BusinessService } from './businessService';
import { ServiceService } from './serviceService';
import { AppointmentService } from './appointmentService';
import { UserBehaviorService } from './userBehaviorService';
import { BusinessClosureService } from './businessClosureService';
import { SubscriptionService } from './subscriptionService';

// Service container for dependency injection
export class ServiceContainer {
  public readonly authService: AuthService;
  public readonly phoneVerificationService: PhoneVerificationService;
  public readonly tokenService: TokenService;
  public readonly rbacService: RBACService;
  public readonly roleService: RoleService;
  public readonly roleRepository: RoleRepository;
  public readonly businessService: BusinessService;
  public readonly serviceService: ServiceService;
  public readonly appointmentService: AppointmentService;
  public readonly userBehaviorService: UserBehaviorService;
  public readonly businessClosureService: BusinessClosureService;
  public readonly subscriptionService: SubscriptionService;

  constructor(repositories: RepositoryContainer) {
    this.tokenService = new TokenService(repositories);
    this.phoneVerificationService = new PhoneVerificationService(repositories, this.tokenService);
    this.authService = new AuthService(repositories, this.phoneVerificationService, this.tokenService);
    
    // RBAC services
    this.roleRepository = repositories.roleRepository;
    this.rbacService = new RBACService(repositories);
    this.roleService = new RoleService(this.roleRepository, this.rbacService);

    // Business services
    this.businessService = new BusinessService(repositories.businessRepository, this.rbacService);
    this.serviceService = new ServiceService(repositories.serviceRepository, this.rbacService);
    this.appointmentService = new AppointmentService(
      repositories.appointmentRepository,
      repositories.serviceRepository,
      repositories.userBehaviorRepository,
      repositories.businessClosureRepository,
      this.rbacService
    );
    this.userBehaviorService = new UserBehaviorService(repositories.userBehaviorRepository, this.rbacService);
    this.businessClosureService = new BusinessClosureService(
      repositories.businessClosureRepository,
      repositories.appointmentRepository,
      this.rbacService
    );
    this.subscriptionService = new SubscriptionService(repositories.subscriptionRepository, this.rbacService);
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
  ServiceService,
  AppointmentService,
  UserBehaviorService,
  BusinessClosureService,
  SubscriptionService
};