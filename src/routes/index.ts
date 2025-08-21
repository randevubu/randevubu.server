import { Router } from 'express';
import { ControllerContainer } from '../controllers';
import { createV1Routes } from './v1';

export function createRoutes(controllers: ControllerContainer): Router {
  const router = Router();

  // Mount v1 API routes
  router.use('/v1', createV1Routes(controllers));

  return router;
}

export default createRoutes;