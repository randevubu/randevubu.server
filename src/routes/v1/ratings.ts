import { Router } from 'express';
import { RatingController } from '../../controllers/ratingController';
import { requireAuth, withAuth } from '../../middleware/authUtils';

export function createRatingRoutes(ratingController: RatingController): Router {
  const router = Router();

  // Rating routes
  router.post(
    '/businesses/:businessId/ratings',
    requireAuth,
    withAuth((req, res) => ratingController.submitRating(req, res))
  );

  router.get('/businesses/:businessId/ratings', (req, res) =>
    ratingController.getBusinessRatings(req, res)
  );

  router.get(
    '/businesses/:businessId/appointments/:appointmentId/can-rate',
    requireAuth,
    withAuth((req, res) => ratingController.canUserRate(req, res))
  );

  router.get(
    '/appointments/:appointmentId/rating',
    requireAuth,
    withAuth((req, res) => ratingController.getUserRating(req, res))
  );

  router.post('/businesses/:businessId/ratings/refresh-cache', (req, res) =>
    ratingController.refreshRatingCache(req, res)
  );

  return router;
}
