import { Router } from 'express';
import { ControllerContainer } from '../controllers';
import { ServiceContainer } from '../services';
import { createV1Routes } from './v1';

export function createRoutes(controllers: ControllerContainer, services: ServiceContainer): Router {
  const router = Router();

  // Mount v1 API routes
  router.use('/v1', createV1Routes(controllers, services));

  return router;
}

export default createRoutes;