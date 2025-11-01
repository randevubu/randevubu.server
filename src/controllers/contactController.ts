import { Request, Response } from 'express';
import { z } from 'zod';
import logger from '../utils/Logger/logger';
import { sendSuccessResponse, sendBaseErrorResponse } from '../utils/responseUtils';
import { BaseError, InternalServerError, ValidationError } from '../types/errors';
import { createErrorContext } from '../utils/requestUtils';
import { getEmailService } from '../lib/aws/email';
import { validateBody } from '../middleware/validation';
import { createUserRateLimiter } from '../middleware/userRateLimit';

// Contact form schema
const contactFormSchema = z.object({
  name: z.string().min(2, 'Ad en az 2 karakter olmalıdır').max(100, 'Ad en fazla 100 karakter olabilir'),
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  phone: z.string().min(10, 'Geçerli bir telefon numarası giriniz').max(20),
  subject: z.string().min(3, 'Konu en az 3 karakter olmalıdır').max(200),
  message: z.string().min(10, 'Mesaj en az 10 karakter olmalıdır').max(2000),
});

export class ContactController {
  /**
   * Send contact form email
   * POST /api/v1/contact
   */
  sendContactMessage = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = contactFormSchema.parse(req.body);
      const context = createErrorContext(req);

      logger.info('Contact form submission', {
        name: body.name,
        email: body.email,
        subject: body.subject,
        requestId: context.requestId,
      });

      const emailService = getEmailService();
      const result = await emailService.sendContactFormEmail(
        body.name,
        body.email,
        body.phone,
        body.subject,
        body.message
      );

      if (!result.success) {
        logger.error('Failed to send contact email', {
          error: result.error,
          context,
        });

        throw new InternalServerError(
          'Mesaj gönderilemedi. Lütfen daha sonra tekrar deneyin.',
          new Error(result.error || 'Unknown error'),
          context
        );
      }

      logger.info('Contact form email sent successfully', {
        messageId: result.messageId,
        context,
      });

      sendSuccessResponse(
        res,
        'Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.',
        {
          messageId: result.messageId,
        }
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        const context = createErrorContext(req);
        const validationError = new ValidationError(
          'Geçersiz form verisi',
          undefined,
          undefined,
          context
        );
        sendBaseErrorResponse(res, validationError);
        return;
      }

      logger.error('Contact form error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        requestId: createErrorContext(req).requestId,
      });

      if (error instanceof BaseError) {
        sendBaseErrorResponse(res, error);
      } else {
        const originalError = error instanceof Error ? error : new Error(String(error));
        const internalError = new InternalServerError(
          'Mesaj gönderilemedi',
          originalError,
          createErrorContext(req)
        );
        sendBaseErrorResponse(res, internalError);
      }
    }
  };
}
