import { Router } from 'express';
import { RatingController } from '../../controllers/ratingController';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth, withAuth } from '../../middleware/authUtils';

export function createRatingRoutes(ratingController: RatingController): Router {
  const router = Router();

  router.post(
    '/businesses/:businessId/ratings',
    requireAuth,
    asyncHandler(withAuth((req, res) => ratingController.submitRating(req, res)))
  );

  router.get(
    '/businesses/:businessId/ratings',
    asyncHandler((req, res) => ratingController.getBusinessRatings(req, res))
  );

  router.get(
    '/businesses/:businessId/appointments/:appointmentId/can-rate',
    requireAuth,
    asyncHandler(withAuth((req, res) => ratingController.canUserRate(req, res)))
  );

  router.get(
    '/appointments/:appointmentId/rating',
    requireAuth,
    asyncHandler(withAuth((req, res) => ratingController.getUserRating(req, res)))
  );

  router.delete(
    '/businesses/:businessId/ratings/:ratingId',
    requireAuth,
    asyncHandler(withAuth((req, res) => ratingController.deleteRating(req, res)))
  );

  router.post(
    '/businesses/:businessId/ratings/refresh-cache',
    asyncHandler((req, res) => ratingController.refreshRatingCache(req, res))
  );

  return router;
}
