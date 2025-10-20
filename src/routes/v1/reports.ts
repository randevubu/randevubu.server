import { Router } from 'express';
import { ReportsController } from '../../controllers/reportsController';
import { ReportsService } from '../../services/domain/reports/reportsService';
import { RepositoryContainer } from '../../repositories';
import { AuthMiddleware, rateLimitByUser } from '../../middleware/auth';
import { ServiceContainer } from '../../services';
import { validateQuery } from '../../middleware/validation';
import { requirePermission, requireAny, withAuth } from '../../middleware/authUtils';
import { PermissionName } from '../../types/auth';
import { staticCache, dynamicCache, semiDynamicCache, realTimeCache } from '../../middleware/cacheMiddleware';
import { trackCachePerformance } from '../../middleware/cacheMonitoring';
import { BusinessContextMiddleware } from '../../middleware/businessContext';
import {
  reportQuerySchema,
  exportReportSchema,
  dashboardConfigSchema,
  businessComparisonSchema,
  advancedFilterSchema
} from '../../schemas/reports.schemas';
import prisma from '../../lib/prisma';

// Initialize dependencies
const repositories = new RepositoryContainer(prisma);
const services = new ServiceContainer(repositories, prisma);
const reportsService = new ReportsService(repositories);
const reportsController = new ReportsController(reportsService);
const authMiddleware = new AuthMiddleware(repositories, services.tokenService, services.rbacService);
const businessContextMiddleware = new BusinessContextMiddleware(prisma);

export function createReportsRoutes(): Router {
  const router = Router();

  // Apply cache monitoring to all routes
  router.use(trackCachePerformance);

  /**
   * @swagger
   * tags:
   *   name: Reports
   *   description: Business analytics and reporting endpoints
   */

  /**
   * @swagger
   * /api/v1/reports/overview:
   *   get:
   *     tags: [Reports]
   *     summary: Get business overview report
   *     description: Comprehensive overview of business performance including appointments, revenue, and customer metrics
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: businessId
   *         schema:
   *           type: string
   *         description: Specific business ID (optional, defaults to user's first business)
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Start date for the report period
   *         example: "2024-01-01T00:00:00.000Z"
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date-time
   *         description: End date for the report period
   *         example: "2024-01-31T23:59:59.999Z"
   *     responses:
   *       200:
   *         description: Business overview report retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Business overview report retrieved successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     businessId:
   *                       type: string
   *                       example: "biz_123456"
   *                     businessName:
   *                       type: string
   *                       example: "Elite Hair Salon"
   *                     totalAppointments:
   *                       type: integer
   *                       example: 245
   *                     completedAppointments:
   *                       type: integer
   *                       example: 220
   *                     canceledAppointments:
   *                       type: integer
   *                       example: 15
   *                     noShowAppointments:
   *                       type: integer
   *                       example: 10
   *                     totalRevenue:
   *                       type: number
   *                       example: 12500.50
   *                     averageAppointmentValue:
   *                       type: number
   *                       example: 56.82
   *                     completionRate:
   *                       type: number
   *                       example: 89.8
   *                     cancellationRate:
   *                       type: number
   *                       example: 6.1
   *                     noShowRate:
   *                       type: number
   *                       example: 4.1
   *                     totalCustomers:
   *                       type: integer
   *                       example: 156
   *                     newCustomers:
   *                       type: integer
   *                       example: 45
   *                     returningCustomers:
   *                       type: integer
   *                       example: 111
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - No accessible businesses
   *       400:
   *         description: Bad request - Invalid date range
   */
  router.get(
    '/overview',
    semiDynamicCache,
    authMiddleware.authenticate,
    businessContextMiddleware.attachBusinessContext.bind(businessContextMiddleware),
    requireAny([PermissionName.VIEW_OWN_CUSTOMERS, PermissionName.VIEW_USER_BEHAVIOR]),
    validateQuery(reportQuerySchema),
    rateLimitByUser(20, 60 * 1000),
    withAuth(reportsController.getBusinessOverview)
  );

  /**
   * @swagger
   * /api/v1/reports/revenue:
   *   get:
   *     tags: [Reports]
   *     summary: Get revenue report
   *     description: Detailed revenue analytics with breakdowns by day, service, and trends
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: businessId
   *         schema:
   *           type: string
   *         description: Specific business ID
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Start date for the report period
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date-time
   *         description: End date for the report period
   *     responses:
   *       200:
   *         description: Revenue report retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
   *                   properties:
   *                     totalRevenue:
   *                       type: number
   *                       example: 12500.50
   *                     periodRevenue:
   *                       type: number
   *                       example: 12500.50
   *                     revenueByDay:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           date:
   *                             type: string
   *                             example: "2024-01-15"
   *                           revenue:
   *                             type: number
   *                             example: 450.00
   *                           appointments:
   *                             type: integer
   *                             example: 8
   *                     revenueByService:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           serviceId:
   *                             type: string
   *                           serviceName:
   *                             type: string
   *                           revenue:
   *                             type: number
   *                           appointments:
   *                             type: integer
   *                           averageValue:
   *                             type: number
   */
  router.get(
    '/revenue',
    semiDynamicCache,
    authMiddleware.authenticate,
    businessContextMiddleware.attachBusinessContext.bind(businessContextMiddleware),
    requireAny([PermissionName.VIEW_OWN_CUSTOMERS, PermissionName.VIEW_USER_BEHAVIOR]),
    validateQuery(reportQuerySchema),
    rateLimitByUser(20, 60 * 1000),
    withAuth(reportsController.getRevenueReport)
  );

  /**
   * @swagger
   * /api/v1/reports/appointments:
   *   get:
   *     tags: [Reports]
   *     summary: Get appointments report
   *     description: Comprehensive appointment analytics including status breakdowns, trends, and staff performance
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: businessId
   *         schema:
   *           type: string
   *         description: Specific business ID
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Start date for the report period
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date-time
   *         description: End date for the report period
   *     responses:
   *       200:
   *         description: Appointment report retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
   *                   properties:
   *                     totalAppointments:
   *                       type: integer
   *                       example: 245
   *                     completedAppointments:
   *                       type: integer
   *                       example: 220
   *                     canceledAppointments:
   *                       type: integer
   *                       example: 15
   *                     noShowAppointments:
   *                       type: integer
   *                       example: 10
   *                     appointmentsByDay:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           date:
   *                             type: string
   *                           total:
   *                             type: integer
   *                           completed:
   *                             type: integer
   *                           canceled:
   *                             type: integer
   *                           noShow:
   *                             type: integer
   */
  router.get(
    '/appointments',
    semiDynamicCache,
    authMiddleware.authenticate,
    requireAny([PermissionName.VIEW_OWN_CUSTOMERS, PermissionName.VIEW_USER_BEHAVIOR]),
    validateQuery(reportQuerySchema),
    rateLimitByUser(20, 60 * 1000),
    withAuth(reportsController.getAppointmentReport)
  );

  /**
   * @swagger
   * /api/v1/reports/customers:
   *   get:
   *     tags: [Reports]
   *     summary: Get customer report
   *     description: Customer analytics including acquisition, retention, and top customers
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: businessId
   *         schema:
   *           type: string
   *         description: Specific business ID
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Start date for the report period
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date-time
   *         description: End date for the report period
   *     responses:
   *       200:
   *         description: Customer report retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
   *                   properties:
   *                     totalCustomers:
   *                       type: integer
   *                       example: 156
   *                     newCustomers:
   *                       type: integer
   *                       example: 45
   *                     returningCustomers:
   *                       type: integer
   *                       example: 111
   *                     averageAppointmentsPerCustomer:
   *                       type: number
   *                       example: 3.2
   *                     topCustomers:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           customerId:
   *                             type: string
   *                           customerName:
   *                             type: string
   *                           totalAppointments:
   *                             type: integer
   *                           totalSpent:
   *                             type: number
   *                           reliabilityScore:
   *                             type: number
   */
  router.get(
    '/customers',
    authMiddleware.authenticate,
    requireAny([PermissionName.VIEW_OWN_CUSTOMERS, PermissionName.VIEW_USER_BEHAVIOR]),
    validateQuery(reportQuerySchema),
    rateLimitByUser(20, 60 * 1000),
    withAuth(reportsController.getCustomerReport)
  );

  /**
   * @swagger
   * /api/v1/reports/dashboard:
   *   get:
   *     tags: [Reports]
   *     summary: Get comprehensive dashboard report
   *     description: Combined report including overview, revenue, appointments, and customer data for dashboard display
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: businessId
   *         schema:
   *           type: string
   *         description: Specific business ID
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Start date for the report period
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date-time
   *         description: End date for the report period
   *     responses:
   *       200:
   *         description: Dashboard report retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
   *                   properties:
   *                     overview:
   *                       type: object
   *                       description: Business overview data
   *                     revenue:
   *                       type: object
   *                       description: Revenue report data
   *                     appointments:
   *                       type: object
   *                       description: Appointment report data
   *                     customers:
   *                       type: object
   *                       description: Customer report data
   *                     generatedAt:
   *                       type: string
   *                       format: date-time
   *                       example: "2024-03-15T10:30:00.000Z"
   */
  router.get(
    '/dashboard',
    authMiddleware.authenticate,
    requireAny([PermissionName.VIEW_OWN_CUSTOMERS, PermissionName.VIEW_USER_BEHAVIOR]),
    validateQuery(reportQuerySchema),
    rateLimitByUser(10, 60 * 1000), // Lower limit for comprehensive reports
    withAuth(reportsController.getDashboardReport)
  );

  /**
   * @swagger
   * /api/v1/reports/export/{reportType}:
   *   get:
   *     tags: [Reports]
   *     summary: Export report in various formats
   *     description: Export reports as JSON or CSV for external analysis
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: reportType
   *         required: true
   *         schema:
   *           type: string
   *           enum: [overview, revenue, appointments, customers]
   *         description: Type of report to export
   *       - in: query
   *         name: format
   *         schema:
   *           type: string
   *           enum: [json, csv]
   *           default: json
   *         description: Export format
   *       - in: query
   *         name: businessId
   *         schema:
   *           type: string
   *         description: Specific business ID
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Start date for the report period
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date-time
   *         description: End date for the report period
   *     responses:
   *       200:
   *         description: Report exported successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               description: JSON format export
   *           text/csv:
   *             schema:
   *               type: string
   *               description: CSV format export
   *       400:
   *         description: Invalid report type or parameters
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/export/:reportType',
    authMiddleware.authenticate,
    requireAny([PermissionName.VIEW_OWN_CUSTOMERS, PermissionName.VIEW_USER_BEHAVIOR]),
    validateQuery(reportQuerySchema),
    rateLimitByUser(5, 60 * 1000), // Stricter limit for exports
    withAuth(reportsController.exportReport)
  );

  /**
   * @swagger
   * /api/v1/reports/comparison:
   *   get:
   *     tags: [Reports]
   *     summary: Get business comparison report
   *     description: Compare performance metrics across multiple businesses owned by the user
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Start date for comparison period
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date-time
   *         description: End date for comparison period
   *     responses:
   *       200:
   *         description: Business comparison report retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
   *                   properties:
   *                     comparisons:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           business:
   *                             type: object
   *                             properties:
   *                               id:
   *                                 type: string
   *                               name:
   *                                 type: string
   *                           overview:
   *                             type: object
   *                             description: Business overview metrics
   *                     totalBusinesses:
   *                       type: integer
   *                       example: 3
   *       400:
   *         description: Need at least 2 businesses for comparison
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/comparison',
    authMiddleware.authenticate,
    requireAny([PermissionName.VIEW_OWN_CUSTOMERS, PermissionName.VIEW_USER_BEHAVIOR]),
    validateQuery(reportQuerySchema),
    rateLimitByUser(10, 60 * 1000),
    withAuth(reportsController.getBusinessComparison)
  );

  // ADVANCED REPORTS

  /**
   * @swagger
   * /api/v1/reports/financial:
   *   get:
   *     tags: [Reports]
   *     summary: Get financial analysis report
   *     description: Detailed financial performance with profit/loss analysis, payment methods, and revenue trends
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: businessId
   *         schema:
   *           type: string
   *         description: Specific business ID
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Start date for analysis period
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date-time
   *         description: End date for analysis period
   *     responses:
   *       200:
   *         description: Financial report retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
   *                   properties:
   *                     totalRevenue:
   *                       type: number
   *                       example: 125000.50
   *                     netProfit:
   *                       type: number
   *                       example: 43750.18
   *                     expenses:
   *                       type: number
   *                       example: 81250.32
   *                     profitMargin:
   *                       type: number
   *                       example: 35.0
   *                     revenueGrowth:
   *                       type: number
   *                       example: 12.5
   *                     avgTransactionValue:
   *                       type: number
   *                       example: 65.25
   *                     paymentMethods:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           method:
   *                             type: string
   *                             example: "Card"
   *                           amount:
   *                             type: number
   *                             example: 56250.23
   *                           percentage:
   *                             type: number
   *                             example: 45
   *                     monthlyTrends:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           month:
   *                             type: string
   *                             example: "2024-03"
   *                           revenue:
   *                             type: number
   *                             example: 20833.42
   *                           expenses:
   *                             type: number
   *                             example: 13541.72
   *                           profit:
   *                             type: number
   *                             example: 7291.70
   */
  router.get(
    '/financial',
    authMiddleware.authenticate,
    requireAny([PermissionName.VIEW_OWN_CUSTOMERS, PermissionName.VIEW_USER_BEHAVIOR]),
    validateQuery(reportQuerySchema),
    rateLimitByUser(15, 60 * 1000),
    withAuth(reportsController.getFinancialReport)
  );

  /**
   * @swagger
   * /api/v1/reports/operational:
   *   get:
   *     tags: [Reports]
   *     summary: Get operational efficiency report
   *     description: Business operations analysis including utilization rates, peak hours, staff workload, and service efficiency
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: businessId
   *         schema:
   *           type: string
   *         description: Specific business ID
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Start date for analysis period
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date-time
   *         description: End date for analysis period
   *     responses:
   *       200:
   *         description: Operational report retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     businessId:
   *                       type: string
   *                     utilizationRate:
   *                       type: number
   *                       example: 75.5
   *                       description: Overall business utilization percentage
   *                     peakHours:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           hour:
   *                             type: integer
   *                             example: 14
   *                           appointments:
   *                             type: integer
   *                             example: 12
   *                           utilization:
   *                             type: number
   *                             example: 120
   *                     averageWaitTime:
   *                       type: number
   *                       example: 12
   *                       description: Average customer wait time in minutes
   *                     serviceEfficiency:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           serviceId:
   *                             type: string
   *                           serviceName:
   *                             type: string
   *                             example: "Hair Cut"
   *                           averageDuration:
   *                             type: number
   *                             example: 45
   *                           scheduledDuration:
   *                             type: number
   *                             example: 40
   *                           efficiency:
   *                             type: number
   *                             example: 88.9
   *                     staffWorkload:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           staffId:
   *                             type: string
   *                           staffName:
   *                             type: string
   *                           hoursWorked:
   *                             type: number
   *                             example: 38.5
   *                           appointmentsHandled:
   *                             type: integer
   *                             example: 23
   *                           utilizationRate:
   *                             type: number
   *                             example: 82.3
   *                           overtime:
   *                             type: number
   *                             example: 2.5
   */
  router.get(
    '/operational',
    authMiddleware.authenticate,
    requireAny([PermissionName.VIEW_OWN_CUSTOMERS, PermissionName.VIEW_USER_BEHAVIOR]),
    validateQuery(reportQuerySchema),
    rateLimitByUser(15, 60 * 1000),
    withAuth(reportsController.getOperationalReport)
  );

  /**
   * @swagger
   * /api/v1/reports/customer-analytics:
   *   get:
   *     tags: [Reports]
   *     summary: Get advanced customer analytics report
   *     description: Deep customer insights including CLV, segmentation, retention, demographics, and loyalty metrics
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: businessId
   *         schema:
   *           type: string
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date-time
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date-time
   *     responses:
   *       200:
   *         description: Customer analytics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     totalCustomers:
   *                       type: integer
   *                       example: 1245
   *                     customerLifetimeValue:
   *                       type: number
   *                       example: 285.50
   *                     acquisitionCost:
   *                       type: number
   *                       example: 45.00
   *                     retentionRate:
   *                       type: number
   *                       example: 68.5
   *                     churnRate:
   *                       type: number
   *                       example: 31.5
   *                     customerSegments:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           segment:
   *                             type: string
   *                             example: "VIP (10+ visits)"
   *                           count:
   *                             type: integer
   *                             example: 62
   *                           avgSpending:
   *                             type: number
   *                             example: 856.50
   *                           frequency:
   *                             type: integer
   *                             example: 12
   *                     loyaltyMetrics:
   *                       type: object
   *                       properties:
   *                         nps:
   *                           type: number
   *                           example: 72
   *                           description: Net Promoter Score
   *                         satisfaction:
   *                           type: number
   *                           example: 4.3
   *                           description: Average satisfaction rating
   *                         repeatRate:
   *                           type: number
   *                           example: 65
   *                           description: Repeat customer percentage
   *                     demographicBreakdown:
   *                       type: object
   *                       properties:
   *                         ageGroups:
   *                           type: array
   *                           items:
   *                             type: object
   *                             properties:
   *                               range:
   *                                 type: string
   *                                 example: "26-35"
   *                               count:
   *                                 type: integer
   *                                 example: 435
   */
  router.get(
    '/customer-analytics',
    authMiddleware.authenticate,
    requireAny([PermissionName.VIEW_OWN_CUSTOMERS, PermissionName.VIEW_USER_BEHAVIOR]),
    validateQuery(reportQuerySchema),
    rateLimitByUser(15, 60 * 1000),
    withAuth(reportsController.getCustomerAnalyticsReport)
  );

  /**
   * @swagger
   * /api/v1/reports/trends:
   *   get:
   *     tags: [Reports]
   *     summary: Get trends analysis and forecasting report
   *     description: Business growth trends, seasonal patterns, and predictive analytics
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: businessId
   *         schema:
   *           type: string
   *       - in: query
   *         name: timeframe
   *         schema:
   *           type: string
   *           enum: [3months, 6months, 12months, 24months]
   *           default: 12months
   *         description: Analysis timeframe
   *     responses:
   *       200:
   *         description: Trends analysis retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     businessId:
   *                       type: string
   *                     timeframe:
   *                       type: string
   *                       example: "12months"
   *                     growthMetrics:
   *                       type: object
   *                       properties:
   *                         revenueGrowth:
   *                           type: number
   *                           example: 12.5
   *                           description: Revenue growth percentage
   *                         customerGrowth:
   *                           type: number
   *                           example: 8.3
   *                         appointmentGrowth:
   *                           type: number
   *                           example: 15.2
   *                     seasonalPatterns:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           period:
   *                             type: string
   *                             example: "Summer"
   *                           metric:
   *                             type: string
   *                             example: "Revenue"
   *                           value:
   *                             type: number
   *                             example: 35000.50
   *                           trend:
   *                             type: string
   *                             enum: [increasing, decreasing, stable]
   *                             example: increasing
   *                     forecasting:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           period:
   *                             type: string
   *                             example: "2024-04"
   *                           predictedRevenue:
   *                             type: number
   *                             example: 21875.25
   *                           predictedAppointments:
   *                             type: integer
   *                             example: 267
   *                           confidence:
   *                             type: number
   *                             example: 0.78
   *                             description: Prediction confidence (0-1)
   */
  router.get(
    '/trends',
    authMiddleware.authenticate,
    requireAny([PermissionName.VIEW_OWN_CUSTOMERS, PermissionName.VIEW_USER_BEHAVIOR]),
    validateQuery(reportQuerySchema),
    rateLimitByUser(10, 60 * 1000),
    withAuth(reportsController.getTrendsAnalysisReport)
  );

  /**
   * @swagger
   * /api/v1/reports/quality:
   *   get:
   *     tags: [Reports]
   *     summary: Get quality metrics and performance report
   *     description: Service quality analysis, customer satisfaction, staff performance, and incident tracking
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: businessId
   *         schema:
   *           type: string
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date-time
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date-time
   *     responses:
   *       200:
   *         description: Quality metrics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     businessId:
   *                       type: string
   *                     customerSatisfaction:
   *                       type: object
   *                       properties:
   *                         averageRating:
   *                           type: number
   *                           example: 4.3
   *                         totalReviews:
   *                           type: integer
   *                           example: 156
   *                         ratingDistribution:
   *                           type: array
   *                           items:
   *                             type: object
   *                             properties:
   *                               stars:
   *                                 type: integer
   *                                 example: 5
   *                               count:
   *                                 type: integer
   *                                 example: 89
   *                     serviceQuality:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           serviceId:
   *                             type: string
   *                           serviceName:
   *                             type: string
   *                             example: "Hair Styling"
   *                           rating:
   *                             type: number
   *                             example: 4.5
   *                           completionRate:
   *                             type: number
   *                             example: 94.2
   *                           reworkRate:
   *                             type: number
   *                             example: 2.1
   *                     staffPerformance:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           staffId:
   *                             type: string
   *                           staffName:
   *                             type: string
   *                           customerRating:
   *                             type: number
   *                             example: 4.6
   *                           punctuality:
   *                             type: number
   *                             example: 92.5
   *                           professionalismScore:
   *                             type: number
   *                             example: 88.7
   */
  router.get(
    '/quality',
    authMiddleware.authenticate,
    requireAny([PermissionName.VIEW_OWN_CUSTOMERS, PermissionName.VIEW_USER_BEHAVIOR]),
    validateQuery(reportQuerySchema),
    rateLimitByUser(15, 60 * 1000),
    withAuth(reportsController.getQualityMetricsReport)
  );

  /**
   * @swagger
   * /api/v1/reports/executive-summary:
   *   get:
   *     tags: [Reports]
   *     summary: Get comprehensive executive summary
   *     description: High-level executive dashboard with all key business metrics, KPIs, and insights
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: businessId
   *         schema:
   *           type: string
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date-time
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date-time
   *     responses:
   *       200:
   *         description: Executive summary retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     overview:
   *                       type: object
   *                       description: Business overview metrics
   *                     financial:
   *                       type: object
   *                       description: Financial performance data
   *                     operational:
   *                       type: object
   *                       description: Operational efficiency metrics
   *                     customer:
   *                       type: object
   *                       description: Customer analytics
   *                     quality:
   *                       type: object
   *                       description: Quality and satisfaction metrics
   *                     kpis:
   *                       type: array
   *                       description: Key Performance Indicators
   *                       items:
   *                         type: object
   *                         properties:
   *                           name:
   *                             type: string
   *                             example: "Revenue"
   *                           value:
   *                             type: number
   *                             example: 125000.50
   *                           unit:
   *                             type: string
   *                             example: "TRY"
   *                           trend:
   *                             type: string
   *                             enum: [up, down, stable]
   *                             example: up
   *                           change:
   *                             type: number
   *                             example: 12.5
   *                             description: Percentage change
   *                     generatedAt:
   *                       type: string
   *                       format: date-time
   *                     reportPeriod:
   *                       type: object
   *                       properties:
   *                         startDate:
   *                           type: string
   *                           format: date-time
   *                         endDate:
   *                           type: string
   *                           format: date-time
   */
  router.get(
    '/executive-summary',
    authMiddleware.authenticate,
    requireAny([PermissionName.VIEW_OWN_CUSTOMERS, PermissionName.VIEW_USER_BEHAVIOR]),
    validateQuery(reportQuerySchema),
    rateLimitByUser(5, 60 * 1000), // Most restrictive for comprehensive report
    withAuth(reportsController.getExecutiveSummary)
  );

  /**
   * @swagger
   * /api/v1/reports/realtime:
   *   get:
   *     tags: [Reports]
   *     summary: Get real-time dashboard metrics
   *     description: Live business metrics updated in real-time for dashboard displays
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: businessId
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Real-time metrics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     todayAppointments:
   *                       type: integer
   *                       example: 23
   *                     todayRevenue:
   *                       type: number
   *                       example: 1450.75
   *                     completionRate:
   *                       type: number
   *                       example: 87.5
   *                     averageValue:
   *                       type: number
   *                       example: 63.08
   *                     onlineBookings:
   *                       type: integer
   *                       example: 16
   *                     walkIns:
   *                       type: integer
   *                       example: 7
   *                     currentUtilization:
   *                       type: number
   *                       example: 78.5
   *                     staffOnline:
   *                       type: integer
   *                       example: 4
   *                     lastUpdated:
   *                       type: string
   *                       format: date-time
   */
  router.get(
    '/realtime',
    realTimeCache,
    authMiddleware.authenticate,
    requireAny([PermissionName.VIEW_OWN_CUSTOMERS, PermissionName.VIEW_USER_BEHAVIOR]),
    rateLimitByUser(60, 60 * 1000), // High limit for real-time data
    withAuth(reportsController.getRealtimeMetrics)
  );

  /**
   * @swagger
   * /api/v1/reports/custom:
   *   post:
   *     tags: [Reports]
   *     summary: Generate custom report with advanced filters
   *     description: Create tailored reports with custom filters, metrics, and grouping options
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - reportType
   *             properties:
   *               reportType:
   *                 type: string
   *                 enum: [overview, revenue, appointments, customers, financial, operational]
   *                 example: "financial"
   *               businessId:
   *                 type: string
   *               startDate:
   *                 type: string
   *                 format: date-time
   *               endDate:
   *                 type: string
   *                 format: date-time
   *               filters:
   *                 type: object
   *                 properties:
   *                   serviceIds:
   *                     type: array
   *                     items:
   *                       type: string
   *                   staffIds:
   *                     type: array
   *                     items:
   *                       type: string
   *                   customerSegment:
   *                     type: string
   *                     enum: [new, returning, vip, all]
   *                   minRevenue:
   *                     type: number
   *                   maxRevenue:
   *                     type: number
   *               metrics:
   *                 type: array
   *                 items:
   *                   type: string
   *                 example: ["revenue", "appointments", "completion_rate"]
   *               groupBy:
   *                 type: string
   *                 enum: [day, week, month]
   *                 default: day
   *           example:
   *             reportType: "financial"
   *             businessId: "biz_123456"
   *             startDate: "2024-01-01T00:00:00Z"
   *             endDate: "2024-03-31T23:59:59Z"
   *             filters:
   *               serviceIds: ["svc_001", "svc_002"]
   *               customerSegment: "returning"
   *               minRevenue: 1000
   *             metrics: ["revenue", "profit", "growth"]
   *             groupBy: "month"
   *     responses:
   *       200:
   *         description: Custom report generated successfully
   *       400:
   *         description: Invalid report type or parameters
   */
  router.post(
    '/custom',
    authMiddleware.authenticate,
    requireAny([PermissionName.VIEW_OWN_CUSTOMERS, PermissionName.VIEW_USER_BEHAVIOR]),
    rateLimitByUser(10, 60 * 1000),
    withAuth(reportsController.generateCustomReport)
  );

  /**
   * @swagger
   * /api/v1/reports/templates:
   *   get:
   *     tags: [Reports]
   *     summary: Get available report templates
   *     description: Retrieve pre-configured report templates for quick report generation
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Report templates retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     templates:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: string
   *                             example: "template_1"
   *                           name:
   *                             type: string
   *                             example: "Monthly Business Summary"
   *                           description:
   *                             type: string
   *                             example: "Comprehensive monthly overview with key metrics"
   *                           reportType:
   *                             type: string
   *                             example: "overview"
   *                           isDefault:
   *                             type: boolean
   *                             example: true
   *                           usageCount:
   *                             type: integer
   *                             example: 25
   *                     totalTemplates:
   *                       type: integer
   *                       example: 3
   *                     defaultTemplate:
   *                       type: string
   *                       example: "template_1"
   */
  router.get(
    '/templates',
    staticCache,
    authMiddleware.authenticate,
    requireAny([PermissionName.VIEW_OWN_CUSTOMERS, PermissionName.VIEW_USER_BEHAVIOR]),
    rateLimitByUser(20, 60 * 1000),
    withAuth(reportsController.getReportTemplates)
  );

  /**
   * @swagger
   * /api/v1/reports/schedule:
   *   post:
   *     tags: [Reports]
   *     summary: Schedule recurring reports
   *     description: Set up automated report generation and delivery via email
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - reportType
   *               - name
   *               - schedule
   *               - recipients
   *             properties:
   *               reportType:
   *                 type: string
   *                 enum: [overview, revenue, appointments, customers, financial, operational]
   *               name:
   *                 type: string
   *                 minLength: 3
   *                 maxLength: 100
   *                 example: "Weekly Revenue Report"
   *               description:
   *                 type: string
   *                 maxLength: 500
   *                 example: "Automated weekly revenue analysis for management"
   *               businessId:
   *                 type: string
   *               schedule:
   *                 type: object
   *                 required:
   *                   - frequency
   *                 properties:
   *                   frequency:
   *                     type: string
   *                     enum: [daily, weekly, monthly]
   *                   dayOfWeek:
   *                     type: integer
   *                     minimum: 0
   *                     maximum: 6
   *                     description: "0=Sunday, 6=Saturday (for weekly reports)"
   *                   dayOfMonth:
   *                     type: integer
   *                     minimum: 1
   *                     maximum: 31
   *                     description: "Day of month (for monthly reports)"
   *                   hour:
   *                     type: integer
   *                     minimum: 0
   *                     maximum: 23
   *                     default: 9
   *                   timezone:
   *                     type: string
   *                     default: "UTC"
   *               recipients:
   *                 type: array
   *                 minItems: 1
   *                 maxItems: 10
   *                 items:
   *                   type: string
   *                   format: email
   *                 example: ["manager@business.com", "owner@business.com"]
   *               format:
   *                 type: string
   *                 enum: [pdf, csv, excel]
   *                 default: pdf
   *               filters:
   *                 type: object
   *                 description: Optional filters to apply to the report
   *           example:
   *             reportType: "revenue"
   *             name: "Weekly Revenue Report"
   *             description: "Weekly revenue analysis for management team"
   *             businessId: "biz_123456"
   *             schedule:
   *               frequency: "weekly"
   *               dayOfWeek: 1
   *               hour: 9
   *               timezone: "Europe/Istanbul"
   *             recipients: ["manager@salon.com", "owner@salon.com"]
   *             format: "pdf"
   *     responses:
   *       201:
   *         description: Report scheduled successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                       example: "scheduled_1710502800000"
   *                     name:
   *                       type: string
   *                     nextRun:
   *                       type: string
   *                       format: date-time
   *                       example: "2024-03-18T09:00:00Z"
   *                     isActive:
   *                       type: boolean
   *                       example: true
   *       400:
   *         description: Missing required fields or invalid parameters
   */
  router.post(
    '/schedule',
    authMiddleware.authenticate,
    requireAny([PermissionName.VIEW_OWN_CUSTOMERS, PermissionName.MANAGE_USER_BEHAVIOR]),
    rateLimitByUser(5, 60 * 1000),
    withAuth(reportsController.scheduleReport)
  );

  return router;
}

export default createReportsRoutes;