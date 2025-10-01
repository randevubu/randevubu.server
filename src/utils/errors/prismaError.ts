import { Prisma } from "@prisma/client";
import { NextFunction, Request, Response } from "express";

const prismaErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    let statusCode = 400;
    let message = "Database error";

    switch (err.code) {
      case "P1000":
        statusCode = 401;
        message = "Authentication failed against database server";
        break;
      case "P1001":
        statusCode = 500;
        message = "Cannot reach database server";
        break;
      case "p1002":
        statusCode = 408;
        message = "Database server timeout";
        break;
      case "P2002":
        statusCode = 400;
        message = "Unique constraint violation";
        break;
      case "P2003":
        statusCode = 400;
        message = "Foreign key constraint failed";
        break;
      case "P2004":
        statusCode = 404;
        message = "Record not found";
        break;
      case "P2021":
        statusCode = 404;
        message = "The table does not exist in the database";
        break;
      case "P3000":
        statusCode = 500;
        message = "Failed to create database";
        break;
      case "P3002":
        statusCode = 500;
        message = "Migration was rolled back due to an error";
        break;
      default:
        statusCode = 400;
        message = "Prisma client known request error";
    }

    res.status(statusCode).json({
      status: "error",
      message,
      requestId: (req as any).requestId || "unknown",
      errorCode: err.code,
    });
  } else {
    next(err);
  }
};

export default prismaErrorHandler;
