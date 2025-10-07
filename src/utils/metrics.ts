import { NextFunction, Request, Response } from "express";
import client from "prom-client";

// Create a Registry which registers the metrics
const register = new client.Registry();

// Add default metrics (process, heap, event loop, GC)
client.collectDefaultMetrics({
  register,
  prefix: 'randevubu_',
});

// HTTP request duration histogram
const httpRequestDuration = new client.Histogram({
  name: "randevubu_http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// HTTP request counter
const httpRequestTotal = new client.Counter({
  name: "randevubu_http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

// Active connections gauge
const activeConnections = new client.Gauge({
  name: "randevubu_active_connections",
  help: "Number of active connections",
  registers: [register],
});

// Database query duration histogram
export const dbQueryDuration = new client.Histogram({
  name: "randevubu_db_query_duration_seconds",
  help: "Duration of database queries in seconds",
  labelNames: ["operation", "model"],
  buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2],
  registers: [register],
});

// Database query counter
export const dbQueryTotal = new client.Counter({
  name: "randevubu_db_queries_total",
  help: "Total number of database queries",
  labelNames: ["operation", "model", "status"],
  registers: [register],
});

// Authentication metrics
export const authAttempts = new client.Counter({
  name: "randevubu_auth_attempts_total",
  help: "Total number of authentication attempts",
  labelNames: ["status", "method"],
  registers: [register],
});

// Verification code metrics
export const verificationCodesSent = new client.Counter({
  name: "randevubu_verification_codes_sent_total",
  help: "Total number of verification codes sent",
  labelNames: ["purpose"],
  registers: [register],
});

// Appointment metrics
export const appointmentsCreated = new client.Counter({
  name: "randevubu_appointments_created_total",
  help: "Total number of appointments created",
  labelNames: ["status"],
  registers: [register],
});

// Payment metrics
export const paymentsProcessed = new client.Counter({
  name: "randevubu_payments_processed_total",
  help: "Total number of payments processed",
  labelNames: ["status", "provider"],
  registers: [register],
});

// Notification metrics
export const notificationsSent = new client.Counter({
  name: "randevubu_notifications_sent_total",
  help: "Total number of notifications sent",
  labelNames: ["channel", "status"],
  registers: [register],
});

// Error rate counter
export const errorTotal = new client.Counter({
  name: "randevubu_errors_total",
  help: "Total number of errors",
  labelNames: ["type", "endpoint"],
  registers: [register],
});

// Middleware to track request metrics
export const metricsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Skip metrics for the metrics endpoint itself
  if (req.path === '/metrics') {
    return next();
  }

  const start = Date.now();

  // Increment active connections
  activeConnections.inc();

  // Track when response finishes
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    const method = req.method;
    const statusCode = res.statusCode.toString();

    // Record metrics
    httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
    httpRequestTotal.inc({ method, route, status_code: statusCode });

    // Decrement active connections
    activeConnections.dec();

    // Track errors
    if (res.statusCode >= 400) {
      const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
      errorTotal.inc({ type: errorType, endpoint: route });
    }
  });

  next();
};

// Endpoint to expose metrics
export const getMetrics = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.set("Content-Type", register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (err) {
    res.status(500).end("Metrics collection error");
  }
};

// Export register for custom metrics
export { register };
