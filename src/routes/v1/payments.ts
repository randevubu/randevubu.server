import express from 'express';
import { PaymentController } from '../../controllers/paymentController';
import { PaymentService } from '../../services/domain/payment/paymentService';
import { DiscountCodeService } from '../../services/domain/discount/discountCodeService';
import { PrismaClient } from '@prisma/client';
import { requireAuth, withAuth } from '../../middleware/authUtils';
import { RepositoryContainer } from '../../repositories';
import { RBACService } from '../../services/domain/rbac/rbacService';

const router = express.Router();

const prisma = new PrismaClient();
const repositories = new RepositoryContainer(prisma);
const rbacService = new RBACService(repositories);
const discountCodeService = new DiscountCodeService(repositories.discountCodeRepository, rbacService);
const paymentService = new PaymentService(prisma, discountCodeService);
const paymentController = new PaymentController(paymentService);

/**
 * @swagger
 * components:
 *   schemas:
 *     PaymentCard:
 *       type: object
 *       required:
 *         - cardHolderName
 *         - cardNumber
 *         - expireMonth
 *         - expireYear
 *         - cvc
 *       properties:
 *         cardHolderName:
 *           type: string
 *           example: "John Doe"
 *         cardNumber:
 *           type: string
 *           pattern: '^\d{16}$'
 *           example: "5528790000000008"
 *         expireMonth:
 *           type: string
 *           pattern: '^(0[1-9]|1[0-2])$'
 *           example: "12"
 *         expireYear:
 *           type: string
 *           pattern: '^\d{4}$'
 *           example: "2030"
 *         cvc:
 *           type: string
 *           pattern: '^\d{3,4}$'
 *           example: "123"
 *     
 *     PaymentBuyer:
 *       type: object
 *       required:
 *         - name
 *         - surname
 *         - email
 *         - address
 *         - city
 *         - country
 *       properties:
 *         name:
 *           type: string
 *           example: "John"
 *         surname:
 *           type: string
 *           example: "Doe"
 *         email:
 *           type: string
 *           format: email
 *           example: "john.doe@example.com"
 *         phone:
 *           type: string
 *           example: "+905350000000"
 *         address:
 *           type: string
 *           example: "Nidakule Göztepe, Merdivenköy Mah. Bora Sok. No:1"
 *         city:
 *           type: string
 *           example: "Istanbul"
 *         country:
 *           type: string
 *           example: "Turkey"
 *         zipCode:
 *           type: string
 *           example: "34732"
 *     
 *     CreateSubscriptionPayment:
 *       type: object
 *       required:
 *         - planId
 *         - card
 *       properties:
 *         planId:
 *           type: string
 *           example: "plan_123"
 *         card:
 *           $ref: '#/components/schemas/PaymentCard'
 *         buyer:
 *           $ref: '#/components/schemas/PaymentBuyer'
 *         installment:
 *           type: string
 *           default: "1"
 *           example: "1"
 *     
 *     RefundPayment:
 *       type: object
 *       properties:
 *         amount:
 *           type: number
 *           minimum: 0
 *           example: 50.00
 *         reason:
 *           type: string
 *           example: "Customer requested refund"
 */

/**
 * @swagger
 * /api/v1/businesses/{businessId}/payments:
 *   post:
 *     summary: Create subscription payment for business
 *     tags: [Payments]
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
 *             $ref: '#/components/schemas/CreateSubscriptionPayment'
 *     responses:
 *       201:
 *         description: Payment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscription:
 *                       type: object
 *                     payment:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         iyzicoPaymentId:
 *                           type: string
 *                         amount:
 *                           type: number
 *                         currency:
 *                           type: string
 *                         status:
 *                           type: string
 *                 message:
 *                   type: string
 *                   example: "Subscription payment successful"
 *       400:
 *         description: Bad request or payment failed
 *       404:
 *         description: Plan not found
 */
router.post('/businesses/:businessId/payments', requireAuth, 
  withAuth((req, res) => paymentController.createSubscriptionPayment(req, res))
);

/**
 * @swagger
 * /api/v1/businesses/{businessId}/payments:
 *   get:
 *     summary: Get payment history for business
 *     tags: [Payments]
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
 *         description: Payment history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     businessId:
 *                       type: string
 *                     subscriptionId:
 *                       type: string
 *       404:
 *         description: No subscription found
 */
router.get('/businesses/:businessId/payments', requireAuth,
  withAuth((req, res) => paymentController.getPaymentHistory(req, res))
);

/**
 * @swagger
 * /api/v1/payments/{paymentId}:
 *   get:
 *     summary: Get payment details
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment details retrieved successfully
 *       404:
 *         description: Payment not found
 */
router.get('/payments/:paymentId', requireAuth,
  withAuth((req, res) => paymentController.getPayment(req, res))
);

/**
 * @swagger
 * /api/v1/payments/{paymentId}/refund:
 *   post:
 *     summary: Refund a payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefundPayment'
 *     responses:
 *       200:
 *         description: Payment refunded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     refundId:
 *                       type: string
 *                     message:
 *                       type: string
 *       400:
 *         description: Refund failed
 */
router.post('/payments/:paymentId/refund', requireAuth,
  withAuth((req, res) => paymentController.refundPayment(req, res))
);

/**
 * @swagger
 * /api/v1/payments/{paymentId}/cancel:
 *   post:
 *     summary: Cancel a payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Customer requested cancellation"
 *     responses:
 *       200:
 *         description: Payment cancelled successfully
 *       400:
 *         description: Cancellation failed
 */
router.post('/payments/:paymentId/cancel', requireAuth,
  withAuth((req, res) => paymentController.cancelPayment(req, res))
);

/**
 * @swagger
 * /api/v1/payments/subscription-plans:
 *   get:
 *     summary: Get all available subscription plans
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Subscription plans retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       displayName:
 *                         type: string
 *                       description:
 *                         type: string
 *                       price:
 *                         type: number
 *                       currency:
 *                         type: string
 *                       billingInterval:
 *                         type: string
 *                       features:
 *                         type: object
 *                       isPopular:
 *                         type: boolean
 *                 message:
 *                   type: string
 */
router.get('/payments/subscription-plans', (req, res) => 
  paymentController.getSubscriptionPlans(req, res)
);

/**
 * @swagger
 * /api/v1/payments/test-cards:
 *   get:
 *     summary: Get test credit cards for Iyzico sandbox
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Test cards retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       $ref: '#/components/schemas/PaymentCard'
 *                     failure:
 *                       $ref: '#/components/schemas/PaymentCard'
 *                     threeDsSuccess:
 *                       $ref: '#/components/schemas/PaymentCard'
 *                 message:
 *                   type: string
 *                   example: "Test cards for Iyzico sandbox environment"
 */
router.get('/payments/test-cards', (req, res) => 
  paymentController.getTestCards(req, res)
);

/**
 * @swagger
 * /api/v1/payments/webhook:
 *   post:
 *     summary: Handle Iyzico webhook notifications
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Iyzico webhook payload
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Webhook processing failed
 */
router.post('/payments/webhook', (req, res) => 
  paymentController.webhookHandler(req, res)
);

export default router;