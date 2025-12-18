import { Response } from 'express';
import { ReportsService } from '../services/domain/reports';
import { GuaranteedAuthRequest } from '../types/auth';
import { BaseError } from '../types/errors';
import { BusinessContextRequest } from '../types/request';

import { handleRouteError, createErrorContext, sendAppErrorResponse } from '../utils/responseUtils';
import { AppError } from '../types/responseTypes';
import { ERROR_CODES } from '../constants/errorCodes';
import logger from '../utils/Logger/logger';
import { ResponseHelper } from '../utils/responseHelper';
type ReportsRequest = GuaranteedAuthRequest & BusinessContextRequest;

export class ReportsController {
  constructor(
    private reportsService: ReportsService,
    private responseHelper: ResponseHelper
  ) {}

  /**
   * Get business overview report
   * GET /api/v1/reports/overview
   */
  getBusinessOverview = async (req: ReportsRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user.id;
      const { businessId, startDate, endDate } = req.query;

      // Get businessId from query or business context
      const resolvedBusinessId = businessId || req.businessContext?.primaryBusinessId;

      // Validate businessId parameter
      if (!resolvedBusinessId || typeof resolvedBusinessId !== 'string') {
        const error = new AppError(
          'Business ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate businessId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (
        !idRegex.test(resolvedBusinessId) ||
        resolvedBusinessId.length < 1 ||
        resolvedBusinessId.length > 50
      ) {
        const error = new AppError('Invalid business ID format', 400, ERROR_CODES.VALIDATION_ERROR);
        return sendAppErrorResponse(res, error);
      }

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      // Validate date range
      if (start && end && start > end) {
        const error = new AppError(
          'Start date must be before end date',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate date formats
      if (startDate && start && isNaN(start.getTime())) {
        const error = new AppError('Invalid start date format', 400, ERROR_CODES.VALIDATION_ERROR);
        return sendAppErrorResponse(res, error);
      }

      if (endDate && end && isNaN(end.getTime())) {
        const error = new AppError('Invalid end date format', 400, ERROR_CODES.VALIDATION_ERROR);
        return sendAppErrorResponse(res, error);
      }

      const report = await this.reportsService.getBusinessOverview(
        userId,
        resolvedBusinessId,
        start,
        end
      );

      await this.responseHelper.success(
        res,
        'success.report.businessOverviewRetrieved',
        report,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };

  /**
   * Get revenue report
   * GET /api/v1/reports/revenue
   */
  getRevenueReport = async (req: ReportsRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user.id;
      const { businessId, startDate, endDate } = req.query;

      // Get businessId from query or business context
      const resolvedBusinessId = businessId || req.businessContext?.primaryBusinessId;

      // Validate businessId parameter
      if (!resolvedBusinessId || typeof resolvedBusinessId !== 'string') {
        const error = new AppError(
          'Business ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate businessId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (
        !idRegex.test(resolvedBusinessId) ||
        resolvedBusinessId.length < 1 ||
        resolvedBusinessId.length > 50
      ) {
        const error = new AppError('Invalid business ID format', 400, ERROR_CODES.VALIDATION_ERROR);
        return sendAppErrorResponse(res, error);
      }

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      // Validate date range
      if (start && end && start > end) {
        const error = new AppError(
          'Start date must be before end date',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate date formats
      if (startDate && start && isNaN(start.getTime())) {
        const error = new AppError('Invalid start date format', 400, ERROR_CODES.VALIDATION_ERROR);
        return sendAppErrorResponse(res, error);
      }

      if (endDate && end && isNaN(end.getTime())) {
        const error = new AppError('Invalid end date format', 400, ERROR_CODES.VALIDATION_ERROR);
        return sendAppErrorResponse(res, error);
      }

      const report = await this.reportsService.getRevenueReport(
        userId,
        resolvedBusinessId,
        start,
        end
      );

      await this.responseHelper.success(res, 'success.report.revenueRetrieved', report, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };

  /**
   * Get appointment report
   * GET /api/v1/reports/appointments
   */
  getAppointmentReport = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user.id;
      const { businessId, startDate, endDate } = req.query;

      // Validate businessId parameter
      if (!businessId || typeof businessId !== 'string') {
        const error = new AppError(
          'Business ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate businessId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        const error = new AppError('Invalid business ID format', 400, ERROR_CODES.VALIDATION_ERROR);
        return sendAppErrorResponse(res, error);
      }

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      // Validate date range
      if (start && end && start > end) {
        const error = new AppError(
          'Start date must be before end date',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate date formats
      if (startDate && start && isNaN(start.getTime())) {
        const error = new AppError('Invalid start date format', 400, ERROR_CODES.VALIDATION_ERROR);
        return sendAppErrorResponse(res, error);
      }

      if (endDate && end && isNaN(end.getTime())) {
        const error = new AppError('Invalid end date format', 400, ERROR_CODES.VALIDATION_ERROR);
        return sendAppErrorResponse(res, error);
      }

      const report = await this.reportsService.getAppointmentReport(userId, businessId, start, end);

      await this.responseHelper.success(
        res,
        'success.report.appointmentRetrieved',
        report,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };

  /**
   * Get customer report
   * GET /api/v1/reports/customers
   */
  getCustomerReport = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user.id;
      const { businessId, startDate, endDate } = req.query;

      // Validate businessId parameter
      if (!businessId || typeof businessId !== 'string') {
        const error = new AppError(
          'Business ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate businessId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        const error = new AppError('Invalid business ID format', 400, ERROR_CODES.VALIDATION_ERROR);
        return sendAppErrorResponse(res, error);
      }

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      // Validate date range
      if (start && end && start > end) {
        const error = new AppError(
          'Start date must be before end date',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate date formats
      if (startDate && start && isNaN(start.getTime())) {
        const error = new AppError('Invalid start date format', 400, ERROR_CODES.VALIDATION_ERROR);
        return sendAppErrorResponse(res, error);
      }

      if (endDate && end && isNaN(end.getTime())) {
        const error = new AppError('Invalid end date format', 400, ERROR_CODES.VALIDATION_ERROR);
        return sendAppErrorResponse(res, error);
      }

      const report = await this.reportsService.getCustomerReport(userId, businessId, start, end);

      await this.responseHelper.success(res, 'success.report.customerRetrieved', report, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };

  /**
   * Get comprehensive dashboard report (combines multiple reports)
   * GET /api/v1/reports/dashboard
   */
  getDashboardReport = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user.id;
      const { businessId, startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      // Get all reports in parallel for better performance
      const [overview, revenue, appointments, customers] = await Promise.all([
        this.reportsService.getBusinessOverview(userId, businessId as string, start, end),
        this.reportsService.getRevenueReport(userId, businessId as string, start, end),
        this.reportsService.getAppointmentReport(userId, businessId as string, start, end),
        this.reportsService.getCustomerReport(userId, businessId as string, start, end),
      ]);

      res.json({
        success: true,
        message: 'Dashboard report retrieved successfully',
        data: {
          overview,
          revenue,
          appointments,
          customers,
          generatedAt: new Date().toISOString(),
          dateRange: {
            startDate: start?.toISOString(),
            endDate: end?.toISOString(),
          },
        },
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };

  /**
   * Export report as CSV
   * GET /api/v1/reports/export/{reportType}
   */
  exportReport = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user.id;
      const { reportType } = req.params;
      const { businessId, startDate, endDate, format = 'json' } = req.query;

      // Validate reportType parameter
      if (!reportType || typeof reportType !== 'string') {
        const error = new AppError(
          'Report type is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      const validReportTypes = ['overview', 'revenue', 'appointments', 'customers'];
      if (!validReportTypes.includes(reportType)) {
        const error = new AppError(
          'Invalid report type. Must be one of: overview, revenue, appointments, customers',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate businessId parameter
      if (!businessId || typeof businessId !== 'string') {
        const error = new AppError(
          'Business ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate businessId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        const error = new AppError('Invalid business ID format', 400, ERROR_CODES.VALIDATION_ERROR);
        return sendAppErrorResponse(res, error);
      }

      // Validate format parameter
      if (format && !['json', 'csv'].includes(format as string)) {
        const error = new AppError(
          'Invalid format. Must be json or csv',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      // Validate date range
      if (start && end && start > end) {
        const error = new AppError(
          'Start date must be before end date',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate date formats
      if (startDate && start && isNaN(start.getTime())) {
        const error = new AppError('Invalid start date format', 400, ERROR_CODES.VALIDATION_ERROR);
        return sendAppErrorResponse(res, error);
      }

      if (endDate && end && isNaN(end.getTime())) {
        const error = new AppError('Invalid end date format', 400, ERROR_CODES.VALIDATION_ERROR);
        return sendAppErrorResponse(res, error);
      }

      let report: any;
      switch (reportType) {
        case 'overview':
          report = await this.reportsService.getBusinessOverview(userId, businessId, start, end);
          break;
        case 'revenue':
          report = await this.reportsService.getRevenueReport(userId, businessId, start, end);
          break;
        case 'appointments':
          report = await this.reportsService.getAppointmentReport(userId, businessId, start, end);
          break;
        case 'customers':
          report = await this.reportsService.getCustomerReport(userId, businessId, start, end);
          break;
      }

      if (format === 'csv') {
        // Convert to CSV format
        const csv = this.convertToCSV(report, reportType);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${reportType}-report-${
            new Date().toISOString().split('T')[0]
          }.csv"`
        );
        res.send(csv);
      } else {
        // Return JSON format
        await this.responseHelper.success(
          res,
          'success.report.exported',
          {
            ...report,
            exportedAt: new Date().toISOString(),
          },
          200,
          req,
          { reportType }
        );
      }
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };

  /**
   * Get business comparison report (if user has multiple businesses)
   * GET /api/v1/reports/comparison
   */
  getBusinessComparison = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user.id;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      // Get all user's businesses
      const businesses = await this.reportsService['getUserBusinesses'](userId);

      if (businesses.length < 2) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Need at least 2 businesses for comparison',
            code: 'INSUFFICIENT_BUSINESSES',
          },
        });
        return;
      }

      // Get overview reports for all businesses
      const comparisons = await Promise.all(
        businesses.map(async (business) => ({
          business,
          overview: await this.reportsService.getBusinessOverview(userId, business.id, start, end),
        }))
      );

      res.json({
        success: true,
        message: 'Business comparison report retrieved successfully',
        data: {
          comparisons,
          totalBusinesses: businesses.length,
          dateRange: {
            startDate: start?.toISOString(),
            endDate: end?.toISOString(),
          },
        },
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };

  // Helper methods

  private createRequestId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private convertToCSV(data: any, reportType: string): string {
    try {
      switch (reportType) {
        case 'overview':
          return this.overviewToCSV(data);
        case 'revenue':
          return this.revenueToCSV(data);
        case 'appointments':
          return this.appointmentsToCSV(data);
        case 'customers':
          return this.customersToCSV(data);
        default:
          return JSON.stringify(data, null, 2);
      }
    } catch (error) {
      logger.error('CSV conversion error', { error, reportType });
      return 'Error converting to CSV format';
    }
  }

  private overviewToCSV(data: any): string {
    const headers = [
      'Business Name',
      'Total Appointments',
      'Completed',
      'Canceled',
      'No Show',
      'Total Revenue',
      'Average Value',
      'Completion Rate %',
      'Total Customers',
    ];

    const row = [
      data.businessName,
      data.totalAppointments,
      data.completedAppointments,
      data.canceledAppointments,
      data.noShowAppointments,
      data.totalRevenue,
      data.averageAppointmentValue,
      data.completionRate,
      data.totalCustomers,
    ];

    return [headers.join(','), row.join(',')].join('\n');
  }

  private revenueToCSV(data: any): string {
    const headers = ['Date', 'Revenue', 'Appointments'];
    const rows = data.revenueByDay.map((day: any) =>
      [day.date, day.revenue, day.appointments].join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  private appointmentsToCSV(data: any): string {
    const headers = ['Date', 'Total', 'Completed', 'Canceled', 'No Show'];
    const rows = data.appointmentsByDay.map((day: any) =>
      [day.date, day.total, day.completed, day.canceled, day.noShow].join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  private customersToCSV(data: any): string {
    const headers = ['Customer Name', 'Total Appointments', 'Total Spent', 'Reliability Score'];
    const rows = data.topCustomers.map((customer: any) =>
      [
        customer.customerName,
        customer.totalAppointments,
        customer.totalSpent,
        customer.reliabilityScore,
      ].join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  // ADVANCED REPORTS

  /**
   * Get financial report with profit/loss analysis
   * GET /api/v1/reports/financial
   */
  getFinancialReport = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user.id;
      const { businessId, startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const report = await this.reportsService.getFinancialReport(
        userId,
        businessId as string,
        start,
        end
      );

      res.json({
        success: true,
        message: 'Financial report retrieved successfully',
        data: report,
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };

  /**
   * Get operational efficiency report
   * GET /api/v1/reports/operational
   */
  getOperationalReport = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user.id;
      const { businessId, startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const report = await this.reportsService.getOperationalReport(
        userId,
        businessId as string,
        start,
        end
      );

      res.json({
        success: true,
        message: 'Operational report retrieved successfully',
        data: report,
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };

  /**
   * Get customer analytics report
   * GET /api/v1/reports/customer-analytics
   */
  getCustomerAnalyticsReport = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user.id;
      const { businessId, startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const report = await this.reportsService.getCustomerAnalyticsReport(
        userId,
        businessId as string,
        start,
        end
      );

      res.json({
        success: true,
        message: 'Customer analytics report retrieved successfully',
        data: report,
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };

  /**
   * Get trends and forecasting report
   * GET /api/v1/reports/trends
   */
  getTrendsAnalysisReport = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user.id;
      const { businessId, timeframe = '12months' } = req.query;

      const report = await this.reportsService.getTrendsAnalysisReport(
        userId,
        businessId as string,
        timeframe as string
      );

      res.json({
        success: true,
        message: 'Trends analysis report retrieved successfully',
        data: report,
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };

  /**
   * Get quality metrics report
   * GET /api/v1/reports/quality
   */
  getQualityMetricsReport = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user.id;
      const { businessId, startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const report = await this.reportsService.getQualityMetricsReport(
        userId,
        businessId as string,
        start,
        end
      );

      res.json({
        success: true,
        message: 'Quality metrics report retrieved successfully',
        data: report,
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };

  /**
   * Get comprehensive executive summary report
   * GET /api/v1/reports/executive-summary
   */
  getExecutiveSummary = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user.id;
      const { businessId, startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const report = await this.reportsService.getExecutiveSummary(
        userId,
        businessId as string,
        start,
        end
      );

      res.json({
        success: true,
        message: 'Executive summary retrieved successfully',
        data: {
          ...report,
          generatedAt: new Date().toISOString(),
          reportPeriod: {
            startDate: start?.toISOString(),
            endDate: end?.toISOString(),
          },
        },
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };

  /**
   * Get real-time dashboard metrics
   * GET /api/v1/reports/realtime
   */
  getRealtimeMetrics = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user.id;
      const { businessId } = req.query;

      // Get today's data
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      const [overview, revenue] = await Promise.all([
        this.reportsService.getBusinessOverview(userId, businessId as string, startOfDay, endOfDay),
        this.reportsService.getRevenueReport(userId, businessId as string, startOfDay, endOfDay),
      ]);

      const nextAppointments = await this.reportsService.getUpcomingAppointments(
        userId,
        businessId as string,
        5
      );

      // Calculate real-time metrics
      const metrics = {
        todayAppointments: overview.totalAppointments,
        todayRevenue: revenue.totalRevenue,
        completionRate: overview.completionRate,
        averageValue: overview.averageAppointmentValue,
        onlineBookings: Math.floor(overview.totalAppointments * 0.7), // Mock
        walkIns: Math.floor(overview.totalAppointments * 0.3), // Mock
        currentUtilization: 78.5, // Mock real-time utilization
        nextAppointments,
        staffOnline: 4, // Mock online staff count
        lastUpdated: new Date().toISOString(),
      };

      res.json({
        success: true,
        message: 'Real-time metrics retrieved successfully',
        data: metrics,
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };

  /**
   * Generate custom report with advanced filters
   * POST /api/v1/reports/custom
   */
  generateCustomReport = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user.id;
      const {
        reportType,
        businessId,
        startDate,
        endDate,
        filters,
        metrics,
        groupBy = 'day',
      } = req.body;

      // Validate required fields
      if (!reportType || !businessId) {
        const error = new AppError(
          'Report type and business ID are required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate report type
      const validReportTypes = [
        'overview',
        'revenue',
        'appointments',
        'customers',
        'financial',
        'operational',
      ];
      if (!validReportTypes.includes(reportType)) {
        const error = new AppError(
          'Invalid report type. Must be one of: overview, revenue, appointments, customers, financial, operational',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate businessId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        const error = new AppError('Invalid business ID format', 400, ERROR_CODES.VALIDATION_ERROR);
        return sendAppErrorResponse(res, error);
      }

      // Validate groupBy parameter
      const validGroupBy = ['day', 'week', 'month', 'year'];
      if (groupBy && !validGroupBy.includes(groupBy)) {
        const error = new AppError(
          'Invalid groupBy value. Must be one of: day, week, month, year',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      // Validate date range
      if (start && end && start > end) {
        const error = new AppError(
          'Start date must be before end date',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate date formats
      if (startDate && start && isNaN(start.getTime())) {
        const error = new AppError('Invalid start date format', 400, ERROR_CODES.VALIDATION_ERROR);
        return sendAppErrorResponse(res, error);
      }

      if (endDate && end && isNaN(end.getTime())) {
        const error = new AppError('Invalid end date format', 400, ERROR_CODES.VALIDATION_ERROR);
        return sendAppErrorResponse(res, error);
      }

      // Get base report based on type
      let report: any;
      switch (reportType) {
        case 'financial':
          report = await this.reportsService.getFinancialReport(userId, businessId, start, end);
          break;
        case 'operational':
          report = await this.reportsService.getOperationalReport(userId, businessId, start, end);
          break;
        default:
          report = await this.reportsService.getBusinessOverview(userId, businessId, start, end);
      }

      // Apply custom filters and metrics (simplified implementation)
      const customReport = {
        reportType,
        filters: filters || {},
        metrics: metrics || [],
        groupBy,
        data: report,
        generatedAt: new Date().toISOString(),
        customizations: {
          appliedFilters: Object.keys(filters || {}).length,
          selectedMetrics: (metrics || []).length,
          groupingLevel: groupBy,
        },
      };

      await this.responseHelper.success(
        res,
        'success.report.customGenerated',
        customReport,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };

  /**
   * Get report templates for the user
   * GET /api/v1/reports/templates
   */
  getReportTemplates = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user.id;

      // Mock templates - in production, these would be stored in database
      const templates = [
        {
          id: 'template_1',
          name: 'Monthly Business Summary',
          description: 'Comprehensive monthly overview with key metrics',
          reportType: 'overview',
          isDefault: true,
          createdAt: '2024-01-15T10:00:00Z',
          lastUsed: '2024-03-10T14:30:00Z',
          usageCount: 25,
        },
        {
          id: 'template_2',
          name: 'Financial Performance Report',
          description: 'Detailed financial analysis with profit/loss breakdown',
          reportType: 'financial',
          isDefault: false,
          createdAt: '2024-02-01T09:00:00Z',
          lastUsed: '2024-03-08T11:15:00Z',
          usageCount: 12,
        },
        {
          id: 'template_3',
          name: 'Customer Insights Dashboard',
          description: 'Customer behavior and analytics report',
          reportType: 'customers',
          isDefault: false,
          createdAt: '2024-02-15T16:00:00Z',
          lastUsed: '2024-03-05T13:45:00Z',
          usageCount: 8,
        },
      ];

      res.json({
        success: true,
        message: 'Report templates retrieved successfully',
        data: {
          templates,
          totalTemplates: templates.length,
          defaultTemplate: templates.find((t) => t.isDefault)?.id,
        },
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };

  /**
   * Schedule recurring reports
   * POST /api/v1/reports/schedule
   */
  scheduleReport = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user.id;
      const {
        reportType,
        name,
        description,
        businessId,
        schedule,
        recipients,
        format = 'pdf',
        filters,
      } = req.body;

      // Validate required fields
      if (!reportType || !name || !schedule || !recipients?.length) {
        const error = new AppError(
          'Missing required fields: reportType, name, schedule, recipients',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate report type
      const validReportTypes = [
        'overview',
        'revenue',
        'appointments',
        'customers',
        'financial',
        'operational',
      ];
      if (!validReportTypes.includes(reportType)) {
        const error = new AppError(
          'Invalid report type. Must be one of: overview, revenue, appointments, customers, financial, operational',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate businessId if provided
      if (businessId) {
        const idRegex = /^[a-zA-Z0-9-_]+$/;
        if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
          const error = new AppError(
            'Invalid business ID format',
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }
      }

      // Validate name length
      if (name.length < 3 || name.length > 100) {
        const error = new AppError(
          'Name must be between 3 and 100 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate format
      const validFormats = ['pdf', 'csv', 'json'];
      if (format && !validFormats.includes(format)) {
        const error = new AppError(
          'Invalid format. Must be one of: pdf, csv, json',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate schedule structure
      if (!schedule.frequency || !['daily', 'weekly', 'monthly'].includes(schedule.frequency)) {
        const error = new AppError(
          'Invalid schedule frequency. Must be daily, weekly, or monthly',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate recipients
      if (!Array.isArray(recipients) || recipients.length === 0) {
        const error = new AppError(
          'Recipients must be a non-empty array',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate email format for recipients
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const recipient of recipients) {
        if (typeof recipient !== 'string' || !emailRegex.test(recipient)) {
          const error = new AppError(
            'Invalid email format in recipients',
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }
      }

      // Create scheduled report record (mock implementation)
      const scheduledReport = {
        id: `scheduled_${Date.now()}`,
        userId,
        reportType,
        name,
        description: description || '',
        businessId,
        schedule,
        recipients,
        format,
        filters: filters || {},
        isActive: true,
        createdAt: new Date().toISOString(),
        nextRun: this.calculateNextRun(schedule),
        totalRuns: 0,
      };

      await this.responseHelper.success(res, 'success.report.scheduled', scheduledReport, 201, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };

  // Helper method to calculate next run time for scheduled reports
  private calculateNextRun(schedule: any): string {
    const now = new Date();
    const nextRun = new Date(now);

    switch (schedule.frequency) {
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1);
        break;
      case 'weekly':
        const daysUntilTarget = (schedule.dayOfWeek - nextRun.getDay() + 7) % 7;
        nextRun.setDate(nextRun.getDate() + (daysUntilTarget || 7));
        break;
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1);
        nextRun.setDate(schedule.dayOfMonth);
        break;
    }

    nextRun.setHours(schedule.hour || 9, 0, 0, 0);
    return nextRun.toISOString();
  }
}
