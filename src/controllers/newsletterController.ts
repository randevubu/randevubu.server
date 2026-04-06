import { Request, Response } from 'express';
import { z } from 'zod';

import { sendBaseErrorResponse } from '../utils/responseUtils';
import { BaseError, InternalServerError, ValidationError } from '../types/errors';
import { createErrorContext } from '../utils/requestUtils';
import { getEmailService } from '../lib/aws/email';
import { ResponseHelper } from '../utils/responseHelper';
import logger from '../utils/Logger/logger';

const newsletterSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
});

export class NewsletterController {
  constructor(private responseHelper: ResponseHelper) {}

  /**
   * Subscribe to newsletter
   * POST /api/v1/newsletter
   */
  subscribe = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = newsletterSchema.parse(req.body);
      const context = createErrorContext(req);

      logger.info('Newsletter subscription request', {
        email: body.email,
        requestId: context.requestId,
      });

      const emailService = getEmailService();
      const result = await emailService.sendNewsletterSubscriptionEmail(body.email);

      if (!result.success) {
        logger.error('Failed to send newsletter subscription email', {
          error: result.error,
          context,
        });

        throw new InternalServerError(
          'Bülten aboneliği kaydedilemedi',
          new Error(result.error || 'Unknown error'),
          context
        );
      }

      logger.info('Newsletter subscription email sent successfully', {
        email: body.email,
        messageId: result.messageId,
        context,
      });

      await this.responseHelper.success(
        res,
        'success.newsletter.subscribed',
        {
          email: body.email,
          messageId: result.messageId,
        },
        200,
        req
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        const context = createErrorContext(req);
        const validationError = new ValidationError(
          'Invalid newsletter subscription data',
          undefined,
          undefined,
          context
        );
        sendBaseErrorResponse(res, validationError);
        return;
      }

      logger.error('Newsletter subscription error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        requestId: createErrorContext(req).requestId,
      });

      if (error instanceof BaseError) {
        sendBaseErrorResponse(res, error);
      } else {
        const originalError = error instanceof Error ? error : new Error(String(error));
        const internalError = new InternalServerError(
          'Bülten aboneliği kaydedilemedi',
          originalError,
          createErrorContext(req)
        );
        sendBaseErrorResponse(res, internalError);
      }
    }
  };
}

