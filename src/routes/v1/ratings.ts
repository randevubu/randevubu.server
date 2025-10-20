import { Router } from 'express';
import { RatingController } from '../../controllers/ratingController';
import { AuthMiddleware } from '../../middleware/auth';
import { RatingService } from '../../services/domain/rating/ratingService';
import { RatingRepository } from '../../repositories/ratingRepository';
import { BusinessRepository } from '../../repositories/businessRepository';
import { RepositoryContainer } from '../../repositories';
import { ServiceContainer } from '../../services';
import prisma from '../../lib/prisma';

const router = Router();

// Initialize dependencies
const repositories = new RepositoryContainer(prisma);
const services = new ServiceContainer(repositories, prisma);
const authMiddleware = new AuthMiddleware(
  repositories,
  services.tokenService,
  services.rbacService
);

const ratingRepository = new RatingRepository(prisma);
const businessRepository = new BusinessRepository(prisma);
const ratingService = new RatingService(ratingRepository, businessRepository);
const ratingController = new RatingController(ratingService);

// Rating routes
router.post(
  '/businesses/:businessId/ratings',
  authMiddleware.authenticate,
  ratingController.submitRating.bind(ratingController)
);

router.get(
  '/businesses/:businessId/ratings',
  ratingController.getBusinessRatings.bind(ratingController)
);

router.get(
  '/businesses/:businessId/appointments/:appointmentId/can-rate',
  authMiddleware.authenticate,
  ratingController.canUserRate.bind(ratingController)
);

router.get(
  '/appointments/:appointmentId/rating',
  authMiddleware.authenticate,
  ratingController.getUserRating.bind(ratingController)
);

router.post(
  '/businesses/:businessId/ratings/refresh-cache',
  ratingController.refreshRatingCache.bind(ratingController)
);

export default router;
