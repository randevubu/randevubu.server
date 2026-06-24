import { Router } from 'express';
import { PaymentController } from '../../controllers/paymentController';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth, withAuth } from '../../middleware/authUtils';
import { staticCache, dynamicCache, realTimeCache } from '../../middleware/cacheMiddleware';
import { strictRateLimit } from '../../middleware/userRateLimit';
import { verifyIyzicoWebhook } from '../../middleware/verifyIyzicoWebhook';

export function createPaymentRoutes(paymentController: PaymentController): Router {
  const router = Router();

  router.post(
    '/businesses/:businessId/payments',
    requireAuth,
    strictRateLimit,
    asyncHandler(withAuth((req, res) => paymentController.createSubscriptionPayment(req, res)))
  );

  router.get(
    '/businesses/:businessId/payments',
    dynamicCache,
    requireAuth,
    asyncHandler(withAuth((req, res) => paymentController.getPaymentHistory(req, res)))
  );

  router.get(
    '/payments/:paymentId',
    realTimeCache,
    requireAuth,
    asyncHandler(withAuth((req, res) => paymentController.getPayment(req, res)))
  );

  router.post(
    '/payments/:paymentId/refund',
    requireAuth,
    strictRateLimit,
    asyncHandler(withAuth((req, res) => paymentController.refundPayment(req, res)))
  );

  router.post(
    '/payments/:paymentId/cancel',
    requireAuth,
    strictRateLimit,
    asyncHandler(withAuth((req, res) => paymentController.cancelPayment(req, res)))
  );

  router.get('/payments/subscription-plans', dynamicCache,
    asyncHandler((req, res) => paymentController.getSubscriptionPlans(req, res))
  );

  if (process.env.NODE_ENV !== 'production') {
    router.get('/payments/test-cards', staticCache,
      asyncHandler((req, res) => paymentController.getTestCards(req, res))
    );
  }

  router.post('/payments/webhook', verifyIyzicoWebhook,
    asyncHandler((req, res) => paymentController.webhookHandler(req, res))
  );

  return router;
}
