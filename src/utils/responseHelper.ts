import { Request, Response } from 'express';
import { TranslationService } from '../services/core/translationService';
import { sendSuccessResponse, sendPaginatedResponse, sendSuccessWithMeta } from './responseUtils';

/**
 * ResponseHelper - Wrapper for response utilities with automatic translation support
 *
 * This helper class wraps response utility functions and automatically provides
 * the TranslationService, eliminating the need to pass it manually in every controller.
 *
 * Usage in controllers:
 *   constructor(
 *     private service: SomeService,
 *     private responseHelper: ResponseHelper
 *   ) {}
 *
 *   async someMethod(req: Request, res: Response) {
 *     await this.responseHelper.success(res, 'success.operation.completed', data, 200, req);
 *   }
 */
export class ResponseHelper {
  constructor(private translationService: TranslationService) {}

  /**
   * Send a success response with automatic translation
   */
  async success<T>(
    res: Response,
    message: string,
    data?: T,
    statusCode: number = 200,
    req?: Request,
    params?: Record<string, string | number | boolean | Date>
  ): Promise<void> {
    return sendSuccessResponse(
      res,
      message,
      data,
      statusCode,
      req,
      params,
      this.translationService
    );
  }

  /**
   * Send a paginated response with automatic translation
   */
  async paginated<T>(
    res: Response,
    message: string,
    items: T[],
    total: number,
    page: number,
    limit: number,
    statusCode: number = 200,
    req?: Request,
    params?: Record<string, string | number | boolean | Date>
  ): Promise<void> {
    return sendPaginatedResponse(
      res,
      message,
      items,
      total,
      page,
      limit,
      statusCode,
      req,
      params,
      this.translationService
    );
  }

  /**
   * Send a success response with custom metadata and automatic translation
   */
  async successWithMeta<T>(
    res: Response,
    message: string,
    data: T,
    meta: Record<string, unknown>,
    statusCode: number = 200,
    req?: Request,
    params?: Record<string, string | number | boolean | Date>
  ): Promise<void> {
    return sendSuccessWithMeta(
      res,
      message,
      data,
      meta,
      statusCode,
      req,
      params,
      this.translationService
    );
  }
}
