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

// Note: Prisma v6+ removed $use middleware
// The normalizePrismaResult function is available for manual use in repositories
// Prisma v6 handles Decimal and null values more gracefully by default

// Log queries in development
if (process.env.NODE_ENV === "development") {
  prisma.$on("query", (e) => {
    logger.debug(`Query: ${e.query}`);
    logger.debug(`Params: ${e.params}`);
    logger.debug(`Duration: ${e.duration}ms`);
  });
}

// Log errors
prisma.$on("error", (e) => {
  logger.error(`Prisma Error: ${e.message}`);
  logger.error(`Target: ${e.target}`);
});

// Graceful shutdown
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

export default prisma;
