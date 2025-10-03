import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

const zodErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof ZodError) {
    const formattedErrors = err.issues.map((issue) => ({
      message: issue.message,
      path: issue.path,
      code: issue.code,
    }));

    res.status(422).json({
      status: "error",
      message: "Validation Error",
      requestId: (req as any).requestId || "unknown",
      details: formattedErrors,
    });
  }

  next(err);
};

export default zodErrorHandler;
