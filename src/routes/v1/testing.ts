import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/authUtils';
import prisma from '../../lib/prisma';
import { TestSubscriptionHelper } from '../../utils/testSubscriptionHelper';
import { SMSService } from '../../services/smsService';
import { logger } from '../../utils/logger';

const router = Router();

// Only enable testing routes in development
if (process.env.NODE_ENV === 'development') {
  const testHelper = new TestSubscriptionHelper(prisma);
  const smsService = new SMSService();

  /**
   * @swagger
   * /api/v1/testing/subscription/create-expiring:
   *   post:
   *     tags: [Testing]
   *     summary: Create test subscription expiring in specified minutes
   *     description: Development only - Creates a subscription that expires quickly for testing renewals
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               businessId:
   *                 type: string
   *               planId:
   *                 type: string
   *               minutesUntilExpiry:
   *                 type: number
   *                 default: 2
   *               autoRenewal:
   *                 type: boolean
   *                 default: true
   *     responses:
   *       200:
   *         description: Test subscription created
   *       400:
   *         description: Invalid request
   */
  router.post('/subscription/create-expiring', requireAuth, async (req: Request, res: Response): Promise<Response> => {
    try {
      const { businessId, planId, minutesUntilExpiry = 2, autoRenewal = true } = req.body;

      if (!businessId || !planId) {
        return res.status(400).json({ error: 'businessId and planId are required' });
      }

      // Create test payment method
      const paymentMethod = await testHelper.createTestPaymentMethod(businessId, true);

      // Create test subscription
      const subscription = await testHelper.createTestSubscriptionExpiringInMinutes(
        businessId,
        planId,
        minutesUntilExpiry,
        autoRenewal,
        paymentMethod.id
      );

      return res.json({
        success: true,
        message: `Test subscription created, expires in ${minutesUntilExpiry} minutes`,
        subscription: {
          id: subscription.id,
          businessId: subscription.businessId,
          currentPeriodEnd: subscription.currentPeriodEnd,
          autoRenewal: subscription.autoRenewal,
          paymentMethodId: subscription.paymentMethodId
        },
        paymentMethod: {
          id: paymentMethod.id,
          lastFourDigits: paymentMethod.lastFourDigits,
          cardBrand: paymentMethod.cardBrand
        },
        testingInfo: {
          expiresAt: subscription.currentPeriodEnd,
          nextRenewalCheck: 'Within 1 minute',
          watchLogs: 'Check server logs for renewal attempts'
        }
      });
    } catch (error) {
      console.error('Create test subscription error:', error);
      return res.status(500).json({ 
        error: 'Failed to create test subscription',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * @swagger
   * /api/v1/testing/subscription/list:
   *   get:
   *     tags: [Testing]
   *     summary: List all test subscriptions
   *     description: Development only - Lists all test subscriptions for monitoring
   *     responses:
   *       200:
   *         description: List of test subscriptions
   */
  router.get('/subscription/list', requireAuth, async (req: Request, res: Response): Promise<Response> => {
    try {
      const testSubscriptions = await testHelper.getTestSubscriptions();
      
      return res.json({
        success: true,
        count: testSubscriptions.length,
        subscriptions: testSubscriptions.map(sub => ({
          id: sub.id,
          businessName: sub.business.name,
          planName: sub.plan.displayName,
          status: sub.status,
          currentPeriodEnd: sub.currentPeriodEnd,
          autoRenewal: sub.autoRenewal,
          failedPaymentCount: sub.failedPaymentCount,
          minutesUntilExpiry: Math.max(0, Math.ceil((sub.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60)))
        })),
        testingSchedule: testHelper.getTestingSchedule()
      });
    } catch (error) {
      console.error('List test subscriptions error:', error);
      return res.status(500).json({ 
        error: 'Failed to list test subscriptions',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * @swagger
   * /api/v1/testing/subscription/cleanup:
   *   delete:
   *     tags: [Testing]
   *     summary: Clean up all test data
   *     description: Development only - Removes all test subscriptions and payment methods
   *     responses:
   *       200:
   *         description: Test data cleaned up
   */
  router.delete('/subscription/cleanup', requireAuth, async (req: Request, res: Response): Promise<Response> => {
    try {
      const result = await testHelper.cleanupTestData();
      
      return res.json({
        success: true,
        message: 'Test data cleaned up successfully',
        deleted: result
      });
    } catch (error) {
      console.error('Cleanup test data error:', error);
      return res.status(500).json({ 
        error: 'Failed to cleanup test data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * @swagger
   * /api/v1/testing/scheduler/status:
   *   get:
   *     tags: [Testing]
   *     summary: Get scheduler status and configuration
   *     description: Development only - Shows current scheduler configuration and status
   *     responses:
   *       200:
   *         description: Scheduler status
   */
  router.get('/scheduler/status', async (req: Request, res: Response): Promise<Response> => {
    try {
      // Get scheduler status from the service container
      // This would need to be passed in or accessed differently in a real implementation
      return res.json({
        success: true,
        mode: process.env.NODE_ENV,
        schedules: {
          renewalCheck: 'Every 1 minute (*/1 * * * *)',
          reminders: 'Every 2 minutes (*/2 * * * *)',
          cleanup: 'Every 5 minutes (*/5 * * * *)',
          timezone: 'Europe/Istanbul'
        },
        testing: {
          createExpiring: 'POST /api/v1/testing/subscription/create-expiring',
          listSubs: 'GET /api/v1/testing/subscription/list',
          cleanup: 'DELETE /api/v1/testing/subscription/cleanup'
        },
        instructions: [
          '1. Create a test subscription with POST /api/v1/testing/subscription/create-expiring',
          '2. Wait 2 minutes for expiry + renewal check runs every minute',
          '3. Check logs for renewal attempts',
          '4. Monitor with GET /api/v1/testing/subscription/list'
        ]
      });
    } catch (error) {
      console.error('Get scheduler status error:', error);
      return res.status(500).json({ 
        error: 'Failed to get scheduler status',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * @swagger
   * /api/v1/testing/sms:
   *   post:
   *     tags: [Testing]
   *     summary: Test SMS sending functionality
   *     description: Development only - Send a test SMS to verify İleti Merkezi integration
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - phoneNumber
   *             properties:
   *               phoneNumber:
   *                 type: string
   *                 example: "05551756598"
   *                 description: "Phone number to send test SMS to"
   *     responses:
   *       200:
   *         description: SMS test result
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 smsResult:
   *                   type: object
   *       400:
   *         description: Bad request
   */
  router.post('/sms', async (req: Request, res: Response): Promise<Response> => {
    try {
      const { phoneNumber } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          error: 'Phone number is required',
        });
      }

      logger.info('Testing SMS service', {
        phoneNumber: phoneNumber.replace(/\d(?=\d{3})/g, '*'),
        requestId: req.headers['x-request-id'] || 'test',
      });

      const result = await smsService.testSMS(phoneNumber);

      return res.json({
        success: true,
        message: 'SMS test completed',
        smsResult: result,
        environment: process.env.NODE_ENV,
        credentials: {
          apiKey: process.env.ILETI_MERKEZI_API_KEY ? 'Configured' : 'Not configured',
          secretKey: process.env.ILETI_MERKEZI_SECRET_KEY ? 'Configured' : 'Not configured',
          sender: process.env.ILETI_MERKEZI_SENDER || 'Not configured',
        }
      });

    } catch (error) {
      logger.error('SMS test error', {
        error: error instanceof Error ? error.message : String(error),
        requestId: req.headers['x-request-id'] || 'test',
      });

      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

} else {
  // In production, return 404 for all testing routes
  router.use('*', (req: Request, res: Response): Response => {
    return res.status(404).json({ error: 'Testing endpoints not available in production' });
  });
}

export default router;