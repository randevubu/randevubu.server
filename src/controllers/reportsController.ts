import { Response } from "express";
import { ReportsService } from "../services/domain/reports";
import { GuaranteedAuthRequest } from "../types/auth";
import { BaseError } from "../types/errors";
import logger from "../utils/Logger/logger";

export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  /**
   * Get business overview report
   * GET /api/v1/reports/overview
   */
  getBusinessOverview = async (
    req: GuaranteedAuthRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user.id;
      const { businessId, startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      // Validate date range
      if (start && end && start > end) {
        res.status(400).json({
          success: false,
          error: {
            message: "Start date must be before end date",
            code: "INVALID_DATE_RANGE",
          },
        });
        return;
      }

      const report = await this.reportsService.getBusinessOverview(
        userId,
        businessId as string,
        start,
        end
      );

      res.json({
        success: true,
        message: "Business overview report retrieved successfully",
        data: report,
      });
    } catch (error) {
      logger.error("Get business overview error", {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user.id,
        requestId: this.createRequestId(),
      });

      if (
        error instanceof Error &&
        error.message.includes("No accessible businesses")
      ) {
        res.status(403).json({
          success: false,
          error: {
            message: "No accessible businesses found",
            code: "NO_BUSINESS_ACCESS",
          },
        });
        return;
      }

      if (error instanceof BaseError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            message: error.message,
            code: error.code,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            message: "Failed to retrieve business overview report",
            code: "REPORT_ERROR",
          },
        });
      }
    }
  };

  /**
   * Get revenue report
   * GET /api/v1/reports/revenue
   */
  getRevenueReport = async (
    req: GuaranteedAuthRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user.id;
      const { businessId, startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const report = await this.reportsService.getRevenueReport(
        userId,
        businessId as string,
        start,
        end
      );

      res.json({
        success: true,
        message: "Revenue report retrieved successfully",
        data: report,
      });
    } catch (error) {
      this.handleError(error, res, "Failed to retrieve revenue report");
    }
  };

  /**
   * Get appointment report
   * GET /api/v1/reports/appointments
   */
  getAppointmentReport = async (
    req: GuaranteedAuthRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user.id;
      const { businessId, startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const report = await this.reportsService.getAppointmentReport(
        userId,
        businessId as string,
        start,
        end
      );

      res.json({
        success: true,
        message: "Appointment report retrieved successfully",
        data: report,
      });
    } catch (error) {
      this.handleError(error, res, "Failed to retrieve appointment report");
    }
  };

  /**
   * Get customer report
   * GET /api/v1/reports/customers
   */
  getCustomerReport = async (
    req: GuaranteedAuthRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user.id;
      const { businessId, startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const report = await this.reportsService.getCustomerReport(
        userId,
        businessId as string,
        start,
        end
      );

      res.json({
        success: true,
        message: "Customer report retrieved successfully",
        data: report,
      });
    } catch (error) {
      this.handleError(error, res, "Failed to retrieve customer report");
    }
  };

  /**
   * Get comprehensive dashboard report (combines multiple reports)
   * GET /api/v1/reports/dashboard
   */
  getDashboardReport = async (
    req: GuaranteedAuthRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user.id;
      const { businessId, startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      // Get all reports in parallel for better performance
      const [overview, revenue, appointments, customers] = await Promise.all([
        this.reportsService.getBusinessOverview(
          userId,
          businessId as string,
          start,
          end
        ),
        this.reportsService.getRevenueReport(
          userId,
          businessId as string,
          start,
          end
        ),
        this.reportsService.getAppointmentReport(
          userId,
          businessId as string,
          start,
          end
        ),
        this.reportsService.getCustomerReport(
          userId,
          businessId as string,
          start,
          end
        ),
      ]);

      res.json({
        success: true,
        message: "Dashboard report retrieved successfully",
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
      this.handleError(error, res, "Failed to retrieve dashboard report");
    }
  };

  /**
   * Export report as CSV
   * GET /api/v1/reports/export/{reportType}
   */
  exportReport = async (
    req: GuaranteedAuthRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user.id;
      const { reportType } = req.params;
      const { businessId, startDate, endDate, format = "json" } = req.query;

      if (
        !["overview", "revenue", "appointments", "customers"].includes(
          reportType
        )
      ) {
        res.status(400).json({
          success: false,
          error: {
            message: "Invalid report type",
            code: "INVALID_REPORT_TYPE",
          },
        });
        return;
      }

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      let report: any;
      switch (reportType) {
        case "overview":
          report = await this.reportsService.getBusinessOverview(
            userId,
            businessId as string,
            start,
            end
          );
          break;
        case "revenue":
          report = await this.reportsService.getRevenueReport(
            userId,
            businessId as string,
            start,
            end
          );
          break;
        case "appointments":
          report = await this.reportsService.getAppointmentReport(
            userId,
            businessId as string,
            start,
            end
          );
          break;
        case "customers":
          report = await this.reportsService.getCustomerReport(
            userId,
            businessId as string,
            start,
            end
          );
          break;
      }

      if (format === "csv") {
        // Convert to CSV format
        const csv = this.convertToCSV(report, reportType);

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${reportType}-report-${
            new Date().toISOString().split("T")[0]
          }.csv"`
        );
        res.send(csv);
      } else {
        // Return JSON format
        res.json({
          success: true,
          message: `${reportType} report exported successfully`,
          data: report,
          exportedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.handleError(error, res, "Failed to export report");
    }
  };

  /**
   * Get business comparison report (if user has multiple businesses)
   * GET /api/v1/reports/comparison
   */
  getBusinessComparison = async (
    req: GuaranteedAuthRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user.id;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      // Get all user's businesses
      const businesses = await this.reportsService["getUserBusinesses"](userId);

      if (businesses.length < 2) {
        res.status(400).json({
          success: false,
          error: {
            message: "Need at least 2 businesses for comparison",
            code: "INSUFFICIENT_BUSINESSES",
          },
        });
        return;
      }

      // Get overview reports for all businesses
      const comparisons = await Promise.all(
        businesses.map(async (business) => ({
          business,
          overview: await this.reportsService.getBusinessOverview(
            userId,
            business.id,
            start,
            end
          ),
        }))
      );

      res.json({
        success: true,
        message: "Business comparison report retrieved successfully",
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
      this.handleError(
        error,
        res,
        "Failed to retrieve business comparison report"
      );
    }
  };

  // Helper methods

  private handleError(
    error: unknown,
    res: Response,
    defaultMessage: string
  ): void {
    logger.error("Reports controller error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (
      error instanceof Error &&
      error.message.includes("No accessible businesses")
    ) {
      res.status(403).json({
        success: false,
        error: {
          message: "No accessible businesses found",
          code: "NO_BUSINESS_ACCESS",
        },
      });
      return;
    }

    if (error instanceof BaseError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          message: error.message,
          code: error.code,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          message: defaultMessage,
          code: "REPORT_ERROR",
        },
      });
    }
  }

  private createRequestId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private convertToCSV(data: any, reportType: string): string {
    try {
      switch (reportType) {
        case "overview":
          return this.overviewToCSV(data);
        case "revenue":
          return this.revenueToCSV(data);
        case "appointments":
          return this.appointmentsToCSV(data);
        case "customers":
          return this.customersToCSV(data);
        default:
          return JSON.stringify(data, null, 2);
      }
    } catch (error) {
      logger.error("CSV conversion error", { error, reportType });
      return "Error converting to CSV format";
    }
  }

  private overviewToCSV(data: any): string {
    const headers = [
      "Business Name",
      "Total Appointments",
      "Completed",
      "Canceled",
      "No Show",
      "Total Revenue",
      "Average Value",
      "Completion Rate %",
      "Total Customers",
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

    return [headers.join(","), row.join(",")].join("\n");
  }

  private revenueToCSV(data: any): string {
    const headers = ["Date", "Revenue", "Appointments"];
    const rows = data.revenueByDay.map((day: any) =>
      [day.date, day.revenue, day.appointments].join(",")
    );

    return [headers.join(","), ...rows].join("\n");
  }

  private appointmentsToCSV(data: any): string {
    const headers = ["Date", "Total", "Completed", "Canceled", "No Show"];
    const rows = data.appointmentsByDay.map((day: any) =>
      [day.date, day.total, day.completed, day.canceled, day.noShow].join(",")
    );

    return [headers.join(","), ...rows].join("\n");
  }

  private customersToCSV(data: any): string {
    const headers = [
      "Customer Name",
      "Total Appointments",
      "Total Spent",
      "Reliability Score",
    ];
    const rows = data.topCustomers.map((customer: any) =>
      [
        customer.customerName,
        customer.totalAppointments,
        customer.totalSpent,
        customer.reliabilityScore,
      ].join(",")
    );

    return [headers.join(","), ...rows].join("\n");
  }

  // ADVANCED REPORTS

  /**
   * Get financial report with profit/loss analysis
   * GET /api/v1/reports/financial
   */
  getFinancialReport = async (
    req: GuaranteedAuthRequest,
    res: Response
  ): Promise<void> => {
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
        message: "Financial report retrieved successfully",
        data: report,
      });
    } catch (error) {
      this.handleError(error, res, "Failed to retrieve financial report");
    }
  };

  /**
   * Get operational efficiency report
   * GET /api/v1/reports/operational
   */
  getOperationalReport = async (
    req: GuaranteedAuthRequest,
    res: Response
  ): Promise<void> => {
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
        message: "Operational report retrieved successfully",
        data: report,
      });
    } catch (error) {
      this.handleError(error, res, "Failed to retrieve operational report");
    }
  };

  /**
   * Get customer analytics report
   * GET /api/v1/reports/customer-analytics
   */
  getCustomerAnalyticsReport = async (
    req: GuaranteedAuthRequest,
    res: Response
  ): Promise<void> => {
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
        message: "Customer analytics report retrieved successfully",
        data: report,
      });
    } catch (error) {
      this.handleError(
        error,
        res,
        "Failed to retrieve customer analytics report"
      );
    }
  };

  /**
   * Get trends and forecasting report
   * GET /api/v1/reports/trends
   */
  getTrendsAnalysisReport = async (
    req: GuaranteedAuthRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user.id;
      const { businessId, timeframe = "12months" } = req.query;

      const report = await this.reportsService.getTrendsAnalysisReport(
        userId,
        businessId as string,
        timeframe as string
      );

      res.json({
        success: true,
        message: "Trends analysis report retrieved successfully",
        data: report,
      });
    } catch (error) {
      this.handleError(error, res, "Failed to retrieve trends analysis report");
    }
  };

  /**
   * Get quality metrics report
   * GET /api/v1/reports/quality
   */
  getQualityMetricsReport = async (
    req: GuaranteedAuthRequest,
    res: Response
  ): Promise<void> => {
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
        message: "Quality metrics report retrieved successfully",
        data: report,
      });
    } catch (error) {
      this.handleError(error, res, "Failed to retrieve quality metrics report");
    }
  };

  /**
   * Get comprehensive executive summary report
   * GET /api/v1/reports/executive-summary
   */
  getExecutiveSummary = async (
    req: GuaranteedAuthRequest,
    res: Response
  ): Promise<void> => {
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
        message: "Executive summary retrieved successfully",
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
      this.handleError(error, res, "Failed to retrieve executive summary");
    }
  };

  /**
   * Get real-time dashboard metrics
   * GET /api/v1/reports/realtime
   */
  getRealtimeMetrics = async (
    req: GuaranteedAuthRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user.id;
      const { businessId } = req.query;

      // Get today's data
      const today = new Date();
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      const [overview, revenue] = await Promise.all([
        this.reportsService.getBusinessOverview(
          userId,
          businessId as string,
          startOfDay,
          endOfDay
        ),
        this.reportsService.getRevenueReport(
          userId,
          businessId as string,
          startOfDay,
          endOfDay
        ),
      ]);

      // Calculate real-time metrics
      const metrics = {
        todayAppointments: overview.totalAppointments,
        todayRevenue: revenue.totalRevenue,
        completionRate: overview.completionRate,
        averageValue: overview.averageAppointmentValue,
        onlineBookings: Math.floor(overview.totalAppointments * 0.7), // Mock
        walkIns: Math.floor(overview.totalAppointments * 0.3), // Mock
        currentUtilization: 78.5, // Mock real-time utilization
        nextAppointments: [], // TODO: Get upcoming appointments
        staffOnline: 4, // Mock online staff count
        lastUpdated: new Date().toISOString(),
      };

      res.json({
        success: true,
        message: "Real-time metrics retrieved successfully",
        data: metrics,
      });
    } catch (error) {
      this.handleError(error, res, "Failed to retrieve real-time metrics");
    }
  };

  /**
   * Generate custom report with advanced filters
   * POST /api/v1/reports/custom
   */
  generateCustomReport = async (
    req: GuaranteedAuthRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user.id;
      const {
        reportType,
        businessId,
        startDate,
        endDate,
        filters,
        metrics,
        groupBy = "day",
      } = req.body;

      // Validate report type
      const validReportTypes = [
        "overview",
        "revenue",
        "appointments",
        "customers",
        "financial",
        "operational",
      ];
      if (!validReportTypes.includes(reportType)) {
        res.status(400).json({
          success: false,
          error: {
            message: "Invalid report type",
            code: "INVALID_REPORT_TYPE",
          },
        });
        return;
      }

      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      // Get base report based on type
      let report: any;
      switch (reportType) {
        case "financial":
          report = await this.reportsService.getFinancialReport(
            userId,
            businessId,
            start,
            end
          );
          break;
        case "operational":
          report = await this.reportsService.getOperationalReport(
            userId,
            businessId,
            start,
            end
          );
          break;
        default:
          report = await this.reportsService.getBusinessOverview(
            userId,
            businessId,
            start,
            end
          );
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

      res.json({
        success: true,
        message: "Custom report generated successfully",
        data: customReport,
      });
    } catch (error) {
      this.handleError(error, res, "Failed to generate custom report");
    }
  };

  /**
   * Get report templates for the user
   * GET /api/v1/reports/templates
   */
  getReportTemplates = async (
    req: GuaranteedAuthRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user.id;

      // Mock templates - in production, these would be stored in database
      const templates = [
        {
          id: "template_1",
          name: "Monthly Business Summary",
          description: "Comprehensive monthly overview with key metrics",
          reportType: "overview",
          isDefault: true,
          createdAt: "2024-01-15T10:00:00Z",
          lastUsed: "2024-03-10T14:30:00Z",
          usageCount: 25,
        },
        {
          id: "template_2",
          name: "Financial Performance Report",
          description: "Detailed financial analysis with profit/loss breakdown",
          reportType: "financial",
          isDefault: false,
          createdAt: "2024-02-01T09:00:00Z",
          lastUsed: "2024-03-08T11:15:00Z",
          usageCount: 12,
        },
        {
          id: "template_3",
          name: "Customer Insights Dashboard",
          description: "Customer behavior and analytics report",
          reportType: "customers",
          isDefault: false,
          createdAt: "2024-02-15T16:00:00Z",
          lastUsed: "2024-03-05T13:45:00Z",
          usageCount: 8,
        },
      ];

      res.json({
        success: true,
        message: "Report templates retrieved successfully",
        data: {
          templates,
          totalTemplates: templates.length,
          defaultTemplate: templates.find((t) => t.isDefault)?.id,
        },
      });
    } catch (error) {
      this.handleError(error, res, "Failed to retrieve report templates");
    }
  };

  /**
   * Schedule recurring reports
   * POST /api/v1/reports/schedule
   */
  scheduleReport = async (
    req: GuaranteedAuthRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user.id;
      const {
        reportType,
        name,
        description,
        businessId,
        schedule,
        recipients,
        format = "pdf",
        filters,
      } = req.body;

      // Validate required fields
      if (!reportType || !name || !schedule || !recipients?.length) {
        res.status(400).json({
          success: false,
          error: {
            message:
              "Missing required fields: reportType, name, schedule, recipients",
            code: "MISSING_REQUIRED_FIELDS",
          },
        });
        return;
      }

      // Create scheduled report record (mock implementation)
      const scheduledReport = {
        id: `scheduled_${Date.now()}`,
        userId,
        reportType,
        name,
        description: description || "",
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

      res.status(201).json({
        success: true,
        message: "Report scheduled successfully",
        data: scheduledReport,
      });
    } catch (error) {
      this.handleError(error, res, "Failed to schedule report");
    }
  };

  // Helper method to calculate next run time for scheduled reports
  private calculateNextRun(schedule: any): string {
    const now = new Date();
    const nextRun = new Date(now);

    switch (schedule.frequency) {
      case "daily":
        nextRun.setDate(nextRun.getDate() + 1);
        break;
      case "weekly":
        const daysUntilTarget = (schedule.dayOfWeek - nextRun.getDay() + 7) % 7;
        nextRun.setDate(nextRun.getDate() + (daysUntilTarget || 7));
        break;
      case "monthly":
        nextRun.setMonth(nextRun.getMonth() + 1);
        nextRun.setDate(schedule.dayOfMonth);
        break;
    }

    nextRun.setHours(schedule.hour || 9, 0, 0, 0);
    return nextRun.toISOString();
  }
}
