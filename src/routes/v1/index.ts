import { Router } from 'express';
import { config } from '../../config/environment';
import { ControllerContainer } from '../../controllers';
import authRoutes from './auth';
import { createRoleRoutes } from './roles';
import { createBusinessRoutes } from './businesses';
import { createServiceRoutes } from './services';
import { createAppointmentRoutes } from './appointments';
import { createUserBehaviorRoutes } from './user-behavior';
import { createBusinessClosureRoutes } from './closures';
import { createSubscriptionRoutes } from './subscriptions';

export function createV1Routes(controllers: ControllerContainer): Router {
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
  router.use('/roles', createRoleRoutes(controllers.roleController));
  router.use('/businesses', createBusinessRoutes(controllers.businessController));
  router.use('/services', createServiceRoutes(controllers.serviceController));
  router.use('/appointments', createAppointmentRoutes(controllers.appointmentController));
  router.use('/user-behavior', createUserBehaviorRoutes(controllers.userBehaviorController));
  router.use('/closures', createBusinessClosureRoutes(controllers.businessClosureController));
  router.use('/subscriptions', createSubscriptionRoutes(controllers.subscriptionController));

  return router;
}

export default createV1Routes;