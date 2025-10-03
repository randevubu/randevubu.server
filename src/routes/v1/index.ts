import { Router } from 'express';
import { config } from '../../config/environment';
import { ControllerContainer } from '../../controllers';
import { ServiceContainer } from '../../services';
import authRoutes from './auth';
import { createRoleRoutes } from './roles';
import { createBusinessRoutes } from './businesses';
import { createBusinessTypeRoutes } from './businessTypes';
import { createServiceRoutes } from './services';
import { createAppointmentRoutes } from './appointments';
import { createUserBehaviorRoutes } from './user-behavior';
import { createBusinessClosureRoutes } from './closures';
import { createSubscriptionRoutes } from './subscriptions';
import { createUserRoutes } from './users';
import { createReportsRoutes } from './reports';
import paymentRoutes from './payments';
import { createDiscountCodeRoutes } from './discountCodes';
import { createUsageRoutes } from './usage';
import { createStaffRoutes } from './staff';
import { createPublicRoutes } from './public';
import { createPushNotificationRoutes } from './pushNotifications';
import testingRouter from './testing';

export function createV1Routes(controllers: ControllerContainer, services: ServiceContainer): Router {
  const router = Router();

  router.get('/status', (req, res) => {
    res.json({
      success: true,
      message: 'API v1 is working!',
      version: config.API_VERSION,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * @swagger
   * /api/v1/status:
   *   get:
   *     tags: [System]
   *     summary: API status
   *     description: Returns API version and current timestamp
   *     responses:
   *       200:
   *         description: API status information
   */
  router.get('/health', (req, res) => {
    res.json({
      success: true,
      status: 'healthy',
      version: config.API_VERSION,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * @swagger
   * /api/v1/health:
   *   get:
   *     tags: [System]
   *     summary: API v1 health check
   *     description: Basic health check for API v1
   *     responses:
   *       200:
   *         description: Health status
   */

  // Mount all v1 routes
  router.use('/auth', authRoutes);
  router.use('/users', createUserRoutes());
  router.use('/roles', createRoleRoutes(controllers.roleController));
  router.use('/businesses', createBusinessRoutes(controllers.businessController, controllers.subscriptionController));
  router.use('/business-types', createBusinessTypeRoutes(controllers.businessTypeController));
  router.use('/services', createServiceRoutes(controllers.serviceController));
  router.use('/appointments', createAppointmentRoutes(controllers.appointmentController));
  router.use('/user-behavior', createUserBehaviorRoutes(controllers.userBehaviorController));
  router.use('/closures', createBusinessClosureRoutes(controllers.businessClosureController));
  router.use('/subscriptions', createSubscriptionRoutes(controllers.subscriptionController));
  router.use('/discount-codes', createDiscountCodeRoutes(controllers.discountCodeController, services.rbacService));
  router.use('/staff', createStaffRoutes());
  router.use('/reports', createReportsRoutes());
  router.use('/businesses', createUsageRoutes(controllers.usageController));
  router.use('/notifications/push', createPushNotificationRoutes(controllers.pushNotificationController));
  router.use('/', paymentRoutes);
  
  // Public routes (no authentication required) 
  router.use('/public', createPublicRoutes());
  
  // Testing routes (development only)
  router.use('/testing', testingRouter);

  return router;
}

export default createV1Routes;