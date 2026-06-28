import { ZodError } from "zod";
import { AppError } from "../../types/responseTypes";

export function convertZodError(err: ZodError): AppError {
  const firstIssue = err.issues[0];
  const field = firstIssue?.path?.join('.') || 'unknown';

  return new AppError('VALIDATION_ERROR', {
    message: `Zod validation: ${err.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
    params: { field },
    details: err.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    })),
  });
}
