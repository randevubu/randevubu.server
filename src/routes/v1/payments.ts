import { Router } from 'express';
import { PaymentController } from '../../controllers/paymentController';
import { requireAuth, withAuth } from '../../middleware/authUtils';
import { staticCache, dynamicCache, realTimeCache } from '../../middleware/cacheMiddleware';

export function createPaymentRoutes(paymentController: PaymentController): Router {
  const router = Router();

  // Create subscription payment for business
  router.post(
    '/businesses/:businessId/payments',
    requireAuth,
    withAuth((req, res) => paymentController.createSubscriptionPayment(req, res))
  );

  // Get payment history for business
  router.get(
    '/businesses/:businessId/payments',
    dynamicCache,
    requireAuth,
    withAuth((req, res) => paymentController.getPaymentHistory(req, res))
  );

  // Get payment details
  router.get(
    '/payments/:paymentId',
    realTimeCache,
    requireAuth,
    withAuth((req, res) => paymentController.getPayment(req, res))
  );

  // Refund a payment
  router.post(
    '/payments/:paymentId/refund',
    requireAuth,
    withAuth((req, res) => paymentController.refundPayment(req, res))
  );

  // Cancel a payment
  router.post(
    '/payments/:paymentId/cancel',
    requireAuth,
    withAuth((req, res) => paymentController.cancelPayment(req, res))
  );

  // Get all available subscription plans
  router.get('/payments/subscription-plans', dynamicCache, (req, res) =>
    paymentController.getSubscriptionPlans(req, res)
  );

  // Get test credit cards for Iyzico sandbox
  router.get('/payments/test-cards', staticCache, (req, res) =>
    paymentController.getTestCards(req, res)
  );

  // Handle Iyzico webhook notifications
  router.post('/payments/webhook', (req, res) => paymentController.webhookHandler(req, res));

  return router;
}
