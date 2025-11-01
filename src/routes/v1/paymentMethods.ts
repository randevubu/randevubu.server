import { Router } from 'express';
import { PaymentMethodController } from '../../controllers/paymentMethodController';
import { withAuth, requireAny } from '../../middleware/authUtils';
import { PermissionName } from '../../types/auth';

export function createPaymentMethodRoutes(paymentMethodController: PaymentMethodController): Router {
  const router = Router();

  /**
   * @swagger
   * /api/v1/payment-methods/business/{businessId}/update:
   *   post:
   *     summary: Update payment method for a subscription
   *     tags: [Payment Methods]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *         description: Business ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - card
   *               - buyer
   *             properties:
   *               card:
   *                 type: object
   *                 properties:
   *                   cardHolderName:
   *                     type: string
   *                   cardNumber:
   *                     type: string
   *                   expireMonth:
   *                     type: string
   *                   expireYear:
   *                     type: string
   *                   cvc:
   *                     type: string
   *               buyer:
   *                 type: object
   *                 properties:
   *                   id:
   *                     type: string
   *                   name:
   *                     type: string
   *                   surname:
   *                     type: string
   *                   email:
   *                     type: string
   *                   phone:
   *                     type: string
   *                   identityNumber:
   *                     type: string
   *                   address:
   *                     type: string
   *                   city:
   *                     type: string
   *                   country:
   *                     type: string
   *     responses:
   *       200:
   *         description: Payment method updated successfully
   *       400:
   *         description: Invalid request data or subscription not found
   *       404:
   *         description: Subscription not found
   */
  router.post(
    '/business/:businessId/update',
    requireAny([PermissionName.MANAGE_OWN_SUBSCRIPTION]),
    withAuth(paymentMethodController.updatePaymentMethod.bind(paymentMethodController))
  );

  /**
   * @swagger
   * /api/v1/payment-methods/business/{businessId}:
   *   get:
   *     summary: Get current payment method for a subscription
   *     tags: [Payment Methods]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *         description: Business ID
   *     responses:
   *       200:
   *         description: Payment method retrieved successfully
   *       404:
   *         description: No payment method found
   */
  router.get(
    '/business/:businessId',
    requireAny([PermissionName.MANAGE_OWN_SUBSCRIPTION]),
    withAuth(paymentMethodController.getPaymentMethod.bind(paymentMethodController))
  );

  /**
   * @swagger
   * /api/v1/payment-methods/business/{businessId}/retry-payment:
   *   post:
   *     summary: Retry failed payment with current payment method
   *     tags: [Payment Methods]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *         description: Business ID
   *     responses:
   *       200:
   *         description: Payment retry initiated
   *       400:
   *         description: No failed payments to retry or subscription not found
   *       404:
   *         description: Subscription not found
   */
  router.post(
    '/business/:businessId/retry-payment',
    requireAny([PermissionName.MANAGE_OWN_SUBSCRIPTION]),
    withAuth(paymentMethodController.retryFailedPayment.bind(paymentMethodController))
  );

  return router;
}
