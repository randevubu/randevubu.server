import { Request, Response, NextFunction } from 'express';
import promClient from 'prom-client';
import { config } from '../config/environment';

// Create a registry for metrics
export const register = new promClient.Registry();

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({
  register,
  prefix: 'randevubu_',
});

// HTTP Request Duration Histogram
export const httpRequestDuration = new promClient.Histogram({
  name: 'randevubu_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

// HTTP Request Counter
export const httpRequestTotal = new promClient.Counter({
  name: 'randevubu_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// Active Connections Gauge
export const activeConnections = new promClient.Gauge({
  name: 'randevubu_active_connections',
  help: 'Number of active connections'
});

// Database Query Duration
export const dbQueryDuration = new promClient.Histogram({
  name: 'randevubu_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 3, 5]
});

// Database Connection Pool Metrics
export const dbConnectionsActive = new promClient.Gauge({
  name: 'randevubu_db_connections_active',
  help: 'Number of active database connections'
});

export const dbConnectionsIdle = new promClient.Gauge({
  name: 'randevubu_db_connections_idle',
  help: 'Number of idle database connections'
});

// Business Metrics
export const appointmentTotal = new promClient.Counter({
  name: 'randevubu_appointments_total',
  help: 'Total number of appointments created',
  labelNames: ['status', 'business_type']
});

export const userRegistrations = new promClient.Counter({
  name: 'randevubu_user_registrations_total',
  help: 'Total number of user registrations',
  labelNames: ['user_type']
});

export const paymentTransactions = new promClient.Counter({
  name: 'randevubu_payment_transactions_total',
  help: 'Total number of payment transactions',
  labelNames: ['status', 'type']
});

export const paymentAmount = new promClient.Histogram({
  name: 'randevubu_payment_amount',
  help: 'Payment transaction amounts',
  labelNames: ['currency', 'type'],
  buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
});

// SMS and Notification Metrics
export const smsNotifications = new promClient.Counter({
  name: 'randevubu_sms_notifications_total',
  help: 'Total number of SMS notifications sent',
  labelNames: ['status', 'type']
});

export const pushNotifications = new promClient.Counter({
  name: 'randevubu_push_notifications_total',
  help: 'Total number of push notifications sent',
  labelNames: ['status', 'type']
});

// Error Metrics
export const applicationErrors = new promClient.Counter({
  name: 'randevubu_application_errors_total',
  help: 'Total number of application errors',
  labelNames: ['error_type', 'severity']
});

// Business KPI Metrics
export const businessSignups = new promClient.Counter({
  name: 'randevubu_business_signups_total',
  help: 'Total number of business signups',
  labelNames: ['subscription_plan']
});

export const subscriptionRenewals = new promClient.Counter({
  name: 'randevubu_subscription_renewals_total',
  help: 'Total number of subscription renewals',
  labelNames: ['plan_type', 'status']
});

// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(activeConnections);
register.registerMetric(dbQueryDuration);
register.registerMetric(dbConnectionsActive);
register.registerMetric(dbConnectionsIdle);
register.registerMetric(appointmentTotal);
register.registerMetric(userRegistrations);
register.registerMetric(paymentTransactions);
register.registerMetric(paymentAmount);
register.registerMetric(smsNotifications);
register.registerMetric(pushNotifications);
register.registerMetric(applicationErrors);
register.registerMetric(businessSignups);
register.registerMetric(subscriptionRenewals);

// Middleware to collect HTTP metrics
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Increment active connections
  activeConnections.inc();

  // Override res.end to capture metrics when response finishes
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path || 'unknown';
    const method = req.method;
    const statusCode = res.statusCode.toString();

    // Record metrics
    httpRequestDuration.observe(
      { method, route, status_code: statusCode },
      duration
    );

    httpRequestTotal.inc({
      method,
      route,
      status_code: statusCode
    });

    // Decrement active connections
    activeConnections.dec();

    // Call original end method and return the result
    return originalEnd.call(this, chunk, encoding, cb);
  };

  next();
};

// Database metrics helper
export const recordDbQuery = (operation: string, table: string, duration: number) => {
  dbQueryDuration.observe(
    { operation, table },
    duration / 1000 // Convert to seconds
  );
};

// Error tracking helper
export const recordError = (errorType: string, severity: 'low' | 'medium' | 'high' | 'critical') => {
  applicationErrors.inc({ error_type: errorType, severity });
};

// Business metrics helpers
export const recordAppointment = (status: string, businessType: string) => {
  appointmentTotal.inc({ status, business_type: businessType });
};

export const recordUserRegistration = (userType: 'customer' | 'business_owner' | 'staff') => {
  userRegistrations.inc({ user_type: userType });
};

export const recordPayment = (status: string, type: string, amount: number, currency: string = 'TRY') => {
  paymentTransactions.inc({ status, type });
  paymentAmount.observe({ currency, type }, amount);
};

export const recordSMS = (status: string, type: string) => {
  smsNotifications.inc({ status, type });
};

export const recordPushNotification = (status: string, type: string) => {
  pushNotifications.inc({ status, type });
};

export const recordBusinessSignup = (subscriptionPlan: string) => {
  businessSignups.inc({ subscription_plan: subscriptionPlan });
};

export const recordSubscriptionRenewal = (planType: string, status: string) => {
  subscriptionRenewals.inc({ plan_type: planType, status });
};

// Metrics endpoint handler
export const getMetrics = async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).end('Error generating metrics');
  }
};