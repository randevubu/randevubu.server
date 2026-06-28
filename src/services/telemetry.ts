import logger from "../utils/Logger/logger";

if (process.env.OTEL_ENABLED === "true") {
  (() => {
    try {
      const { NodeSDK } = require("@opentelemetry/sdk-node");
      const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
      const { resourceFromAttributes, Resource } = require("@opentelemetry/resources");
      const { ATTR_SERVICE_NAME, ATTR_DEPLOYMENT_ENVIRONMENT_NAME } = require("@opentelemetry/semantic-conventions");
      const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
      const { OTLPMetricExporter } = require("@opentelemetry/exporter-metrics-otlp-http");
      const { OTLPLogExporter } = require("@opentelemetry/exporter-logs-otlp-http");
      const { PeriodicExportingMetricReader } = require("@opentelemetry/sdk-metrics");
      const { BatchLogRecordProcessor, LoggerProvider } = require("@opentelemetry/sdk-logs");
      const { logs } = require("@opentelemetry/api-logs");

      const serviceName = process.env.OTEL_SERVICE_NAME || "randevubu-server";
      const environment = process.env.NODE_ENV || "development";

      const createResource = () => {
        const attrs: Record<string, string> = {
          "service.name": serviceName,
          "deployment.environment": environment,
        };

        if (typeof resourceFromAttributes === "function") {
          return resourceFromAttributes(attrs);
        }
        return new Resource(attrs);
      };

      const resource = createResource();

      // ── Traces ────────────────────────────────────────────────────────
      const traceExporter = new OTLPTraceExporter();

      // ── Metrics ───────────────────────────────────────────────────────
      const metricReader = new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter(),
        exportIntervalMillis: 30000,
      });

      // ── Logs ──────────────────────────────────────────────────────────
      const logExporter = new OTLPLogExporter();
      const logRecordProcessor = new BatchLogRecordProcessor(logExporter);
      const loggerProvider = new LoggerProvider({ resource });
      loggerProvider.addLogRecordProcessor(logRecordProcessor);
      logs.setGlobalLoggerProvider(loggerProvider);

      // ── SDK ───────────────────────────────────────────────────────────
      const sdk = new NodeSDK({
        resource,
        traceExporter,
        metricReader,
        instrumentations: [
          getNodeAutoInstrumentations({
            "@opentelemetry/instrumentation-http": {
              enabled: true,
              ignoreIncomingPaths: [/^\/health$/, /^\/api-docs/, /^\/api-docs\.json$/],
            },
            "@opentelemetry/instrumentation-express": { enabled: true },
          }),
        ],
      });

      sdk.start();
      logger.info("OpenTelemetry initialized (traces + metrics + logs)");

      const shutdown = async (): Promise<void> => {
        try {
          await loggerProvider.shutdown();
          await sdk.shutdown();
          logger.info("OpenTelemetry shut down");
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          logger.error("Error during OpenTelemetry shutdown", { error: error.message });
        }
      };

      process.on("SIGTERM", shutdown);
      process.on("SIGINT", shutdown);
    } catch (e) {
      const err = e as Error;
      logger.warn("OpenTelemetry init failed. Skipping.", {
        error: err.message,
        hint: "Install @opentelemetry/* packages or set OTEL_ENABLED=false",
      });
    }
  })();
}
