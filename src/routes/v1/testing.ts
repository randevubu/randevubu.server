import { Request, Response, Router } from "express";
import prisma from "../../lib/prisma";
import {
  attachBusinessContext,
  requireBusinessAccess,
} from "../../middleware/attachBusinessContext";
import { requireAuth } from "../../middleware/authUtils";
import { BusinessContextRequest } from "../../middleware/businessContext";
import { UsageRepository } from "../../repositories/usageRepository";
import { AppointmentSchedulerService } from "../../services/domain/appointment/appointmentSchedulerService";
import { RBACService } from "../../services/domain/rbac/rbacService";
import { SMSService } from "../../services/domain/sms/smsService";
import { UsageService } from "../../services/domain/usage/usageService";
import logger from "../../utils/Logger/logger";
import { TestSubscriptionHelper } from "../../utils/testSubscriptionHelper";

const router = Router();

// Only enable testing routes in development
if (process.env.NODE_ENV === "development") {
  const testHelper = new TestSubscriptionHelper(prisma);
  const smsService = new SMSService();
  const usageRepository = new UsageRepository(prisma);
  const rbacService = new RBACService({ usageRepository } as any);
  const usageService = new UsageService(usageRepository, rbacService, prisma);
  const appointmentScheduler = new AppointmentSchedulerService(prisma, {
    developmentMode: true,
  });

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
  router.post(
    "/subscription/create-expiring",
    requireAuth,
    async (req: Request, res: Response): Promise<Response> => {
      try {
        const {
          businessId,
          planId,
          minutesUntilExpiry = 2,
          autoRenewal = true,
        } = req.body;

        if (!businessId || !planId) {
          return res
            .status(400)
            .json({ error: "businessId and planId are required" });
        }

        // Create test payment method
        const paymentMethod = await testHelper.createTestPaymentMethod(
          businessId,
          true
        );

        // Create test subscription
        const subscription =
          await testHelper.createTestSubscriptionExpiringInMinutes(
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
            paymentMethodId: subscription.paymentMethodId,
          },
          paymentMethod: {
            id: paymentMethod.id,
            lastFourDigits: paymentMethod.lastFourDigits,
            cardBrand: paymentMethod.cardBrand,
          },
          testingInfo: {
            expiresAt: subscription.currentPeriodEnd,
            nextRenewalCheck: "Within 1 minute",
            watchLogs: "Check server logs for renewal attempts",
          },
        });
      } catch (error) {
        console.error("Create test subscription error:", error);
        return res.status(500).json({
          error: "Failed to create test subscription",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

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
  router.get(
    "/subscription/list",
    requireAuth,
    async (req: Request, res: Response): Promise<Response> => {
      try {
        const testSubscriptions = await testHelper.getTestSubscriptions();

        return res.json({
          success: true,
          count: testSubscriptions.length,
          subscriptions: testSubscriptions.map((sub) => ({
            id: sub.id,
            businessName: sub.business.name,
            planName: sub.plan.displayName,
            status: sub.status,
            currentPeriodEnd: sub.currentPeriodEnd,
            autoRenewal: sub.autoRenewal,
            failedPaymentCount: sub.failedPaymentCount,
            minutesUntilExpiry: Math.max(
              0,
              Math.ceil(
                (sub.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60)
              )
            ),
          })),
          testingSchedule: testHelper.getTestingSchedule(),
        });
      } catch (error) {
        console.error("List test subscriptions error:", error);
        return res.status(500).json({
          error: "Failed to list test subscriptions",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

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
  router.delete(
    "/subscription/cleanup",
    requireAuth,
    async (req: Request, res: Response): Promise<Response> => {
      try {
        const result = await testHelper.cleanupTestData();

        return res.json({
          success: true,
          message: "Test data cleaned up successfully",
          deleted: result,
        });
      } catch (error) {
        console.error("Cleanup test data error:", error);
        return res.status(500).json({
          error: "Failed to cleanup test data",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

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
  router.get(
    "/scheduler/status",
    async (req: Request, res: Response): Promise<Response> => {
      try {
        // Get scheduler status from the service container
        // This would need to be passed in or accessed differently in a real implementation
        return res.json({
          success: true,
          mode: process.env.NODE_ENV,
          schedules: {
            renewalCheck: "Every 1 minute (*/1 * * * *)",
            reminders: "Every 2 minutes (*/2 * * * *)",
            cleanup: "Every 5 minutes (*/5 * * * *)",
            timezone: "Europe/Istanbul",
          },
          testing: {
            createExpiring: "POST /api/v1/testing/subscription/create-expiring",
            listSubs: "GET /api/v1/testing/subscription/list",
            cleanup: "DELETE /api/v1/testing/subscription/cleanup",
          },
          instructions: [
            "1. Create a test subscription with POST /api/v1/testing/subscription/create-expiring",
            "2. Wait 2 minutes for expiry + renewal check runs every minute",
            "3. Check logs for renewal attempts",
            "4. Monitor with GET /api/v1/testing/subscription/list",
          ],
        });
      } catch (error) {
        console.error("Get scheduler status error:", error);
        return res.status(500).json({
          error: "Failed to get scheduler status",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * @swagger
   * /api/v1/testing/sms/{businessId}:
   *   post:
   *     tags: [Testing]
   *     summary: Test SMS sending functionality with usage tracking
   *     description: Development only - Send a test SMS to verify İleti Merkezi integration and usage tracking
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *         description: Business ID for usage tracking
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
   *                 usageUpdated:
   *                   type: boolean
   *       400:
   *         description: Bad request
   *       403:
   *         description: SMS quota exceeded
   */
  router.post(
    "/sms/:businessId",
    requireAuth,
    attachBusinessContext,
    requireBusinessAccess,
    async (req: BusinessContextRequest, res: Response): Promise<Response> => {
      try {
        const { phoneNumber } = req.body;
        const businessId = req.params.businessId;

        if (!phoneNumber) {
          return res.status(400).json({
            success: false,
            error: "Phone number is required",
          });
        }

        // Check if business can send SMS based on subscription limits
        const canSendSms = await usageService.canSendSms(businessId);
        if (!canSendSms.allowed) {
          return res.status(403).json({
            success: false,
            error: `SMS quota exceeded: ${canSendSms.reason}`,
            quotaInfo: canSendSms,
          });
        }

        logger.info("Testing SMS service with usage tracking", {
          businessId,
          phoneNumber: phoneNumber.replace(/\d(?=\d{3})/g, "*"),
          requestId: req.headers["x-request-id"] || "test",
        });

        const result = await smsService.testSMS(phoneNumber);

        // Record SMS usage if successful
        let usageUpdated = false;
        if (result.success) {
          await usageService.recordSmsUsage(businessId, 1);
          usageUpdated = true;
          logger.info("SMS usage recorded", { businessId, smsCount: 1 });
        }

        return res.json({
          success: true,
          message: "SMS test completed with usage tracking",
          smsResult: result,
          usageUpdated,
          businessId,
          environment: process.env.NODE_ENV,
          credentials: {
            apiKey: process.env.ILETI_MERKEZI_API_KEY
              ? "Configured"
              : "Not configured",
            secretKey: process.env.ILETI_MERKEZI_SECRET_KEY
              ? "Configured"
              : "Not configured",
            sender: process.env.ILETI_MERKEZI_SENDER || "Not configured",
          },
        });
      } catch (error) {
        logger.error("SMS test error", {
          error: error instanceof Error ? error.message : String(error),
          businessId: req.params.businessId,
          requestId: req.headers["x-request-id"] || "test",
        });

        return res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * @swagger
   * /api/v1/testing/appointments/auto-complete:
   *   post:
   *     tags: [Testing]
   *     summary: Trigger appointment auto-completion (Development only)
   *     description: Manually trigger the appointment auto-completion process for testing
   *     responses:
   *       200:
   *         description: Auto-completion triggered
   *       500:
   *         description: Error triggering auto-completion
   */
  router.post(
    "/appointments/auto-complete",
    async (req: Request, res: Response): Promise<Response> => {
      try {
        const result = await appointmentScheduler.triggerAutoComplete();
        logger.info(
          `🔧 Manual trigger: Auto-completed ${result.completed} appointments`
        );

        return res.json({
          success: true,
          message: `Auto-completed ${result.completed} appointments`,
          data: result,
        });
      } catch (error) {
        logger.error("❌ Error in manual appointment auto-completion:", error);
        return res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * @swagger
   * /api/v1/testing/appointments/scheduler-status:
   *   get:
   *     tags: [Testing]
   *     summary: Get appointment scheduler status (Development only)
   *     description: Get the current status of the appointment scheduler
   *     responses:
   *       200:
   *         description: Scheduler status
   */
  router.get(
    "/appointments/scheduler-status",
    async (req: Request, res: Response): Promise<Response> => {
      try {
        const status = appointmentScheduler.getStatus();

        return res.json({
          success: true,
          data: status,
        });
      } catch (error) {
        logger.error("❌ Error getting appointment scheduler status:", error);
        return res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );
} else {
  // In production, return 404 for all testing routes
  router.use("*", (req: Request, res: Response): Response => {
    return res
      .status(404)
      .json({ error: "Testing endpoints not available in production" });
  });
}

export default router;
