import { Prisma } from "@prisma/client";
import { AppError } from "../../types/responseTypes";

export function convertPrismaError(err: Prisma.PrismaClientKnownRequestError): AppError {
  const meta = err.meta as Record<string, unknown> | undefined;

  switch (err.code) {
    // ── Validation / Constraint Errors ────────────────────────────────────

    case 'P2000': {
      const field = meta?.column_name ?? 'unknown';
      return new AppError('VALIDATION_ERROR', {
        message: `Value too long for field: ${field}`,
        params: { field: String(field) },
        details: { prismaCode: err.code, meta },
      });
    }

    case 'P2002': {
      const target = meta?.target;
      const field = Array.isArray(target) ? target[0] : String(target ?? 'unknown');
      return new AppError('RESOURCE_CONFLICT', {
        message: `Unique constraint failed on: ${field}`,
        params: { field },
        details: { prismaCode: err.code, meta },
      });
    }

    case 'P2003': {
      const fieldName = meta?.field_name ?? 'unknown';
      return new AppError('VALIDATION_ERROR', {
        message: `Foreign key constraint failed on: ${fieldName}`,
        params: { field: String(fieldName) },
        details: { prismaCode: err.code, meta },
      });
    }

    case 'P2004':
      return new AppError('VALIDATION_ERROR', {
        message: 'Database constraint violation',
        details: { prismaCode: err.code, meta },
      });

    case 'P2005': {
      const field = meta?.column_name ?? 'unknown';
      return new AppError('VALIDATION_ERROR', {
        message: `Invalid value for field type: ${field}`,
        params: { field: String(field) },
        details: { prismaCode: err.code, meta },
      });
    }

    case 'P2006': {
      const field = meta?.model_name ?? 'unknown';
      return new AppError('VALIDATION_ERROR', {
        message: `Invalid value provided for: ${field}`,
        params: { field: String(field) },
        details: { prismaCode: err.code, meta },
      });
    }

    case 'P2007':
      return new AppError('VALIDATION_ERROR', {
        message: 'Data validation error',
        details: { prismaCode: err.code, meta },
      });

    case 'P2011': {
      const field = meta?.constraint ?? 'unknown';
      return new AppError('REQUIRED_FIELD_MISSING', {
        message: `Null constraint violation on: ${field}`,
        params: { field: String(field) },
        details: { prismaCode: err.code, meta },
      });
    }

    case 'P2012': {
      const field = meta?.path ?? 'unknown';
      return new AppError('REQUIRED_FIELD_MISSING', {
        message: `Missing required value: ${field}`,
        params: { field: String(field) },
        details: { prismaCode: err.code, meta },
      });
    }

    case 'P2013': {
      const field = meta?.argument_name ?? 'unknown';
      return new AppError('REQUIRED_FIELD_MISSING', {
        message: `Missing required argument: ${field}`,
        params: { field: String(field) },
        details: { prismaCode: err.code, meta },
      });
    }

    case 'P2014':
      return new AppError('VALIDATION_ERROR', {
        message: 'Required relation violation',
        details: { prismaCode: err.code, meta },
      });

    case 'P2020': {
      const field = meta?.column_name ?? 'unknown';
      return new AppError('VALIDATION_ERROR', {
        message: `Value out of range for: ${field}`,
        params: { field: String(field) },
        details: { prismaCode: err.code, meta },
      });
    }

    case 'P2025':
      return new AppError('VALIDATION_ERROR', {
        message: `Record not found: ${meta?.cause ?? err.message}`,
        details: { prismaCode: err.code, meta },
      });

    case 'P2033': {
      const field = meta?.column_name ?? 'unknown';
      return new AppError('VALIDATION_ERROR', {
        message: `Number too large for: ${field}`,
        params: { field: String(field) },
        details: { prismaCode: err.code, meta },
      });
    }

    // ── Connection / Infrastructure Errors ────────────────────────────────

    case 'P1000':
      return new AppError('DATABASE_ERROR', {
        message: 'Database authentication failed',
        details: { prismaCode: err.code },
      });

    case 'P1001':
    case 'P1002':
      return new AppError('SERVICE_UNAVAILABLE', {
        message: `Database unreachable: ${err.code}`,
        details: { prismaCode: err.code },
      });

    case 'P1008':
      return new AppError('SERVICE_UNAVAILABLE', {
        message: 'Database operation timed out',
        details: { prismaCode: err.code },
      });

    case 'P2024':
      return new AppError('SERVICE_UNAVAILABLE', {
        message: 'Timed out fetching database connection from pool',
        details: { prismaCode: err.code, meta },
      });

    // ── Transaction Errors ────────────────────────────────────────────────

    case 'P2028':
      return new AppError('DATABASE_ERROR', {
        message: 'Transaction API error',
        details: { prismaCode: err.code, meta },
      });

    case 'P2034':
      return new AppError('RESOURCE_CONFLICT', {
        message: 'Transaction failed due to conflict or deadlock',
        details: { prismaCode: err.code, meta },
      });

    // ── Schema / Internal Errors ──────────────────────────────────────────

    case 'P2008':
    case 'P2009':
    case 'P2010':
      return new AppError('INTERNAL_SERVER_ERROR', {
        message: `Query error: ${err.code}`,
        details: { prismaCode: err.code, meta },
      });

    case 'P2021': {
      const table = meta?.table ?? 'unknown';
      return new AppError('INTERNAL_SERVER_ERROR', {
        message: `Table not found: ${table}`,
        details: { prismaCode: err.code, meta },
      });
    }

    case 'P2022': {
      const column = meta?.column ?? 'unknown';
      return new AppError('INTERNAL_SERVER_ERROR', {
        message: `Column not found: ${column}`,
        details: { prismaCode: err.code, meta },
      });
    }

    case 'P3000':
    case 'P3002':
      return new AppError('INTERNAL_SERVER_ERROR', {
        message: `Database schema error: ${err.code}`,
        details: { prismaCode: err.code, meta },
      });

    default:
      return new AppError('DATABASE_ERROR', {
        message: `Prisma ${err.code}: ${err.message}`,
        details: { prismaCode: err.code, meta },
      });
  }
}
