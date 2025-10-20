import { Router } from 'express';
import { DailyNotebookController } from '../../controllers/dailyNotebookController';
import { requireAuth } from '../../middleware/authUtils';
import { trackCachePerformance } from '../../middleware/cacheMonitoring';

export function createDailyNotebookRoutes(controller: DailyNotebookController): Router {
  const router = Router();

  // Apply cache monitoring to all routes
  router.use(trackCachePerformance);

  /**
   * @swagger
   * /api/v1/businesses/{businessId}/daily-notebook/{year}/{month}:
   *   get:
   *     tags: [Daily Notebook]
   *     summary: Get or create daily notebook for a specific month
   *     description: Returns the daily notebook with all entries, columns, and calculated totals for a specific business and month
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *         description: Business ID
   *       - in: path
   *         name: year
   *         required: true
   *         schema:
   *           type: integer
   *         description: Year (e.g., 2024)
   *       - in: path
   *         name: month
   *         required: true
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 12
   *         description: Month (1-12)
   *     responses:
   *       200:
   *         description: Daily notebook retrieved successfully
   *       400:
   *         description: Invalid parameters
   *       403:
   *         description: Access denied
   *       500:
   *         description: Server error
   */
  router.get(
    '/businesses/:businessId/daily-notebook/:year/:month',
    requireAuth,
    (req, res) => controller.getNotebook(req, res)
  );

  /**
   * @swagger
   * /api/v1/businesses/{businessId}/daily-notebook/{year}/{month}/entries:
   *   put:
   *     tags: [Daily Notebook]
   *     summary: Update daily entries in bulk
   *     description: Update multiple daily entries at once
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: year
   *         required: true
   *         schema:
   *           type: integer
   *       - in: path
   *         name: month
   *         required: true
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 12
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               entries:
   *                 type: object
   *                 description: Object with day numbers as keys and column data as values
   *                 example:
   *                   1:
   *                     col_123: 1500
   *                     col_456: 200
   *                   2:
   *                     col_123: 2000
   *                     col_456: 250
   *     responses:
   *       200:
   *         description: Entries updated successfully
   *       400:
   *         description: Invalid request
   *       403:
   *         description: Access denied
   */
  router.put(
    '/businesses/:businessId/daily-notebook/:year/:month/entries',
    requireAuth,
    (req, res) => controller.updateDailyEntries(req, res)
  );

  /**
   * @swagger
   * /api/v1/businesses/{businessId}/daily-notebook/{year}/{month}/entries/single:
   *   patch:
   *     tags: [Daily Notebook]
   *     summary: Update a single entry
   *     description: Update a single daily entry value
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: year
   *         required: true
   *         schema:
   *           type: integer
   *       - in: path
   *         name: month
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - day
   *               - columnId
   *               - amount
   *             properties:
   *               day:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 31
   *               columnId:
   *                 type: string
   *               amount:
   *                 type: number
   *               note:
   *                 type: string
   *                 nullable: true
   *     responses:
   *       200:
   *         description: Entry updated successfully
   *       400:
   *         description: Invalid request
   *       403:
   *         description: Access denied
   */
  router.patch(
    '/businesses/:businessId/daily-notebook/:year/:month/entries/single',
    requireAuth,
    (req, res) => controller.updateSingleEntry(req, res)
  );

  /**
   * @swagger
   * /api/v1/businesses/{businessId}/revenue-columns:
   *   get:
   *     tags: [Revenue Columns]
   *     summary: Get all revenue columns for a business
   *     description: Returns all income and expense columns configured for the business
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Revenue columns retrieved successfully
   *       403:
   *         description: Access denied
   */
  router.get(
    '/businesses/:businessId/revenue-columns',
    requireAuth,
    (req, res) => controller.getColumns(req, res)
  );

  /**
   * @swagger
   * /api/v1/businesses/{businessId}/revenue-columns:
   *   post:
   *     tags: [Revenue Columns]
   *     summary: Create a new revenue column
   *     description: Create a new income or expense column
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - type
   *             properties:
   *               name:
   *                 type: string
   *                 maxLength: 100
   *                 example: "Ürün Satışı"
   *               type:
   *                 type: string
   *                 enum: [INCOME, EXPENSE]
   *                 example: "INCOME"
   *               priority:
   *                 type: string
   *                 enum: [HIGH, MEDIUM, LOW]
   *                 default: MEDIUM
   *               visible:
   *                 type: boolean
   *                 default: true
   *               sortOrder:
   *                 type: integer
   *     responses:
   *       201:
   *         description: Revenue column created successfully
   *       400:
   *         description: Invalid request
   *       403:
   *         description: Access denied
   */
  router.post(
    '/businesses/:businessId/revenue-columns',
    requireAuth,
    (req, res) => controller.createColumn(req, res)
  );

  /**
   * @swagger
   * /api/v1/businesses/{businessId}/revenue-columns/{columnId}:
   *   put:
   *     tags: [Revenue Columns]
   *     summary: Update a revenue column
   *     description: Update properties of an existing revenue column
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: columnId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *                 maxLength: 100
   *               type:
   *                 type: string
   *                 enum: [INCOME, EXPENSE]
   *               priority:
   *                 type: string
   *                 enum: [HIGH, MEDIUM, LOW]
   *               visible:
   *                 type: boolean
   *               sortOrder:
   *                 type: integer
   *     responses:
   *       200:
   *         description: Revenue column updated successfully
   *       400:
   *         description: Invalid request
   *       403:
   *         description: Access denied
   *       404:
   *         description: Column not found
   */
  router.put(
    '/businesses/:businessId/revenue-columns/:columnId',
    requireAuth,
    (req, res) => controller.updateColumn(req, res)
  );

  /**
   * @swagger
   * /api/v1/businesses/{businessId}/revenue-columns/{columnId}:
   *   delete:
   *     tags: [Revenue Columns]
   *     summary: Delete a revenue column
   *     description: Delete a revenue column and all associated entries
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: columnId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Revenue column deleted successfully
   *       403:
   *         description: Access denied
   *       404:
   *         description: Column not found
   */
  router.delete(
    '/businesses/:businessId/revenue-columns/:columnId',
    requireAuth,
    (req, res) => controller.deleteColumn(req, res)
  );

  /**
   * @swagger
   * /api/v1/businesses/{businessId}/appointment-revenue/{year}/{month}:
   *   get:
   *     tags: [Daily Notebook]
   *     summary: Get appointment revenue for a specific month
   *     description: Returns daily appointment revenue from completed appointments
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: year
   *         required: true
   *         schema:
   *           type: integer
   *       - in: path
   *         name: month
   *         required: true
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 12
   *     responses:
   *       200:
   *         description: Appointment revenue retrieved successfully
   *       400:
   *         description: Invalid parameters
   *       403:
   *         description: Access denied
   */
  router.get(
    '/businesses/:businessId/appointment-revenue/:year/:month',
    requireAuth,
    (req, res) => controller.getAppointmentRevenue(req, res)
  );

  /**
   * @swagger
   * /api/v1/businesses/{businessId}/financial-summary:
   *   get:
   *     tags: [Daily Notebook]
   *     summary: Get financial summary from Daily Notebook
   *     description: Returns financial summary for reports dashboard - includes all income, expenses, and net profit from Daily Notebook
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *         description: Business ID
   *       - in: query
   *         name: year
   *         schema:
   *           type: integer
   *         description: Year (defaults to current year)
   *       - in: query
   *         name: month
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 12
   *         description: Month (defaults to current month)
   *     responses:
   *       200:
   *         description: Financial summary retrieved successfully
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
   *                     summary:
   *                       type: object
   *                       properties:
   *                         period:
   *                           type: object
   *                           properties:
   *                             year:
   *                               type: integer
   *                             month:
   *                               type: integer
   *                             monthName:
   *                               type: string
   *                         totals:
   *                           type: object
   *                           properties:
   *                             totalRevenue:
   *                               type: number
   *                               description: Total income from all columns
   *                             totalExpenses:
   *                               type: number
   *                               description: Total expenses from all columns
   *                             netProfit:
   *                               type: number
   *                               description: Total revenue minus total expenses
   *                             averageDaily:
   *                               type: number
   *                             averageIncome:
   *                               type: number
   *                             averageExpense:
   *                               type: number
   *                         incomeBreakdown:
   *                           type: array
   *                           items:
   *                             type: object
   *                             properties:
   *                               columnId:
   *                                 type: string
   *                               columnName:
   *                                 type: string
   *                               amount:
   *                                 type: number
   *                               isSystem:
   *                                 type: boolean
   *                         expenseBreakdown:
   *                           type: array
   *                         daysWithData:
   *                           type: integer
   *                         lastUpdated:
   *                           type: string
   *                           format: date-time
   *       400:
   *         description: Invalid parameters
   *       403:
   *         description: Access denied
   */
  router.get(
    '/businesses/:businessId/financial-summary',
    requireAuth,
    (req, res) => controller.getFinancialSummary(req, res)
  );

  return router;
}

