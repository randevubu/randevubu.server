import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncLikeHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Response | Promise<void | Response>;

export function asyncHandler(fn: AsyncLikeHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
