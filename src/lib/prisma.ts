import { PrismaClient } from "@prisma/client";
import { config } from "../config/environment";
import logger from "../utils/Logger/logger";

// Connection pool configuration
const getConnectionUrl = (): string => {
  const baseUrl = config.DATABASE_URL || '';

  if (!baseUrl) {
    throw new Error('DATABASE_URL is not configured');
  }

  // Parse existing URL to check if it already has connection params
  const url = new URL(baseUrl);

  // Add connection pool parameters if not already present
  if (!url.searchParams.has('connection_limit')) {
    url.searchParams.set('connection_limit', config.NODE_ENV === 'production' ? '20' : '10');
  }
  if (!url.searchParams.has('pool_timeout')) {
    url.searchParams.set('pool_timeout', '10');
  }
  if (!url.searchParams.has('connect_timeout')) {
    url.searchParams.set('connect_timeout', '10');
  }

  return url.toString();
};

// Slow query threshold in milliseconds
const SLOW_QUERY_THRESHOLD = config.NODE_ENV === 'production' ? 1000 : 500;

// Create a single Prisma client instance with connection pooling
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: getConnectionUrl(),
    },
  },
  log: [
    {
      emit: "event",
      level: "query",
    },
    {
      emit: "event",
      level: "error",
    },
    {
      emit: "event",
      level: "info",
    },
    {
      emit: "event",
      level: "warn",
    },
  ],
  // Add query timeout to prevent hanging queries
  transactionOptions: {
    timeout: 30000, // 30 seconds
  },
});

// Type for Prisma Decimal object
interface PrismaDecimal {
  toNumber(): number;
}

// Type guard for Prisma Decimal
function isPrismaDecimal(obj: unknown): obj is PrismaDecimal {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'toNumber' in obj &&
    typeof (obj as Record<string, unknown>).toNumber === 'function'
  );
}

// Normalize Prisma results globally (Decimal -> number, null -> undefined, keep Date)
function normalizePrismaResult<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Prisma Decimal objects expose toNumber
  if (isPrismaDecimal(obj)) {
    return obj.toNumber() as T;
  }

  if (Array.isArray(obj)) {
    return (obj as unknown[]).map((item: unknown) => normalizePrismaResult(item)) as T;
  }

  if (
    typeof obj === 'object' &&
    obj !== null &&
    (obj as { constructor?: { name?: string } })?.constructor?.name !== 'Date'
  ) {
    const result: Record<string, unknown> = {};
    for (const key in obj as Record<string, unknown>) {
      const value = (obj as Record<string, unknown>)[key];
      if (value === null) {
        result[key] = undefined;
      } else {
        result[key] = normalizePrismaResult(value);
      }
    }
    return result as T;
  }

  return obj;
}

// Query performance tracking
const queryStats = {
  totalQueries: 0,
  slowQueries: 0,
  totalDuration: 0,
  slowestQuery: { query: '', duration: 0 },
};

// Enhanced query logging with slow query detection
prisma.$on("query", (e) => {
  queryStats.totalQueries++;
  queryStats.totalDuration += e.duration;

  // Track slowest query
  if (e.duration > queryStats.slowestQuery.duration) {
    queryStats.slowestQuery = {
      query: e.query,
      duration: e.duration,
    };
  }

  // Log slow queries in all environments
  if (e.duration > SLOW_QUERY_THRESHOLD) {
    queryStats.slowQueries++;

    logger.warn('Slow query detected', {
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
      threshold: `${SLOW_QUERY_THRESHOLD}ms`,
      timestamp: new Date().toISOString(),
    });
  }

  // Detailed logging in development only
  if (config.NODE_ENV === "development") {
    const logLevel = e.duration > SLOW_QUERY_THRESHOLD ? 'warn' : 'debug';
    logger[logLevel]('Query executed', {
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
    });
  }
});

// Log info events
prisma.$on("info", (e) => {
  logger.info('Prisma info', {
    message: e.message,
    timestamp: e.timestamp,
  });
});

// Log warning events
prisma.$on("warn", (e) => {
  logger.warn('Prisma warning', {
    message: e.message,
    timestamp: e.timestamp,
  });
});

// Log errors
prisma.$on("error", (e) => {
  logger.error('Prisma error', {
    message: e.message,
    target: e.target,
    timestamp: e.timestamp,
  });
});

// Export query stats for monitoring
export const getQueryStats = () => ({
  ...queryStats,
  avgDuration: queryStats.totalQueries > 0
    ? Math.round(queryStats.totalDuration / queryStats.totalQueries)
    : 0,
  slowQueryPercentage: queryStats.totalQueries > 0
    ? Math.round((queryStats.slowQueries / queryStats.totalQueries) * 100)
    : 0,
});

// Reset stats (useful for testing/monitoring)
export const resetQueryStats = () => {
  queryStats.totalQueries = 0;
  queryStats.slowQueries = 0;
  queryStats.totalDuration = 0;
  queryStats.slowestQuery = { query: '', duration: 0 };
};

// Graceful shutdown
const shutdownPrisma = async () => {
  logger.info('Closing Prisma connection (graceful shutdown)...');

  // Log final query stats
  const stats = getQueryStats();
  logger.info('Final query statistics', stats);

  try {
    await prisma.$disconnect();
    logger.info('✅ Prisma connection closed successfully');
  } catch (error) {
    logger.error('Error closing Prisma connection', error);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdownPrisma);
process.on('SIGINT', shutdownPrisma);
process.on("beforeExit", shutdownPrisma);

export default prisma;
export { normalizePrismaResult };
