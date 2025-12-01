import logger from "../utils/Logger/logger";
// OpenTelemetry bootstrap. Safe no-op when disabled via env.
// Enable by setting OTEL_ENABLED=true and providing OTLP endpoint/token.

// Guard: only initialize when explicitly enabled
if (process.env.OTEL_ENABLED === "true") {
  (() => {
    // Minimal structural types to avoid `any` while keeping optional deps dynamic
    type Startable = { start(): Promise<void>; shutdown(): Promise<void> };
    type NodeSDKConstructor = new (config: {
      resource: unknown;
      traceExporter?: unknown;
      instrumentations?: unknown[];
    }) => Startable;
    type GetInstrFn = (options?: Record<string, unknown>) => unknown;
    type SemanticAttrs = Record<string, string>;
    type ExporterCtor = new (config?: Record<string, unknown>) => unknown;

    let NodeSDK: NodeSDKConstructor;
    let getNodeAutoInstrumentations: GetInstrFn;
    let resourceFromAttributes: (attrs: Record<string, unknown>) => unknown;
    let SemanticResourceAttributes: SemanticAttrs;
    let OTLPTraceExporter: ExporterCtor;

    try {
      // Lazy import to avoid requiring deps when disabled
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const sdkNode = require("@opentelemetry/sdk-node");
      NodeSDK = sdkNode.NodeSDK as NodeSDKConstructor;
      
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const autoInstr = require("@opentelemetry/auto-instrumentations-node");
      getNodeAutoInstrumentations = autoInstr.getNodeAutoInstrumentations as GetInstrFn;
      
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const resources = require("@opentelemetry/resources");
      // Newer versions use resourceFromAttributes instead of Resource constructor
      resourceFromAttributes = resources.resourceFromAttributes as (attrs: Record<string, unknown>) => unknown;
      
      if (typeof resourceFromAttributes !== "function") {
        logger.warn("OpenTelemetry resourceFromAttributes not found. Skipping telemetry init.", {
          hint: "Check @opentelemetry/resources package version or set OTEL_ENABLED=false",
        });
        return;
      }
      
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const semanticConventions = require("@opentelemetry/semantic-conventions");
      SemanticResourceAttributes = semanticConventions.SemanticResourceAttributes as SemanticAttrs;
      
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const otlpExporter = require("@opentelemetry/exporter-trace-otlp-http");
      OTLPTraceExporter = otlpExporter.OTLPTraceExporter as ExporterCtor;
    } catch (e) {
      const err = e as Error;
      logger.warn("OpenTelemetry packages not installed. Skipping telemetry init.", {
        error: err.message,
        hint: "Install @opentelemetry/* packages or set OTEL_ENABLED=false",
      });
      return;
    }

    const serviceName = process.env.OTEL_SERVICE_NAME || "randevubu-server";

    // Traces exporter (Grafana Cloud Tempo/OTLP HTTP)
    const traceExporter = new OTLPTraceExporter({
      // Uses env: OTEL_EXPORTER_OTLP_ENDPOINT, OTEL_EXPORTER_OTLP_HEADERS
    });

    // Metrics: keep default for now. You can add OTLP metric exporter later if needed.

    const sdk = new NodeSDK({
      resource: resourceFromAttributes({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || "development",
      }),
      traceExporter,
      // Auto-instrument HTTP, Express, Prisma, etc.
      instrumentations: [
        getNodeAutoInstrumentations({
          "@opentelemetry/instrumentation-http": {
            enabled: true,
            ignoreIncomingPaths: [/^\/health$/, /^\/api-docs/, /^\/api-docs\.json$/],
          },
          "@opentelemetry/instrumentation-express": {
            enabled: true,
          },
        }) as unknown,
      ],
    });

    try {
      sdk.start();
      logger.info("OpenTelemetry initialized");
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error("Failed to initialize OpenTelemetry", { 
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      });
    }

    // Ensure clean shutdown
    const shutdown = async (): Promise<void> => {
      try {
        await sdk.shutdown();
        logger.info("OpenTelemetry shut down");
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error("Error during OpenTelemetry shutdown", { 
          error: error.message,
          stack: process.env.NODE_ENV === "development" ? error.stack : undefined
        });
      }
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  })();
}


