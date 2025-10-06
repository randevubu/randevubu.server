import { NextFunction, Request, Response } from "express";
// import client from "prom-client";

// Create a Registry which registers the metrics
// const register = new client.Registry();

// Add default metrics (process, heap, event loop)
// client.collectDefaultMetrics({ register });

// HTTP request duration histogram
// const httpRequestDuration = new client.Histogram({
//   name: "http_request_duration_seconds",
//   help: "Duration of HTTP requests in seconds",
//   labelNames: ["method", "route", "status_code"],
//   buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5],
// });

// register.registerMetric(httpRequestDuration);

export const metricsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Metrics disabled - prom-client not available
  next();
};

export const getMetrics = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.set("Content-Type", "text/plain");
    res.end("# Metrics disabled - prom-client not available");
  } catch (err) {
    res.status(500).end("Metrics collection error");
  }
};


