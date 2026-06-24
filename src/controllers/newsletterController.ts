import { Request, Response } from 'express';
import { z } from 'zod';

import { AppError } from '../types/responseTypes';
import { getEmailService } from '../lib/aws/email';
import { ResponseHelper } from '../utils/responseHelper';
import logger from '../utils/Logger/logger';

const newsletterSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
});

export class NewsletterController {
  constructor(private responseHelper: ResponseHelper) {}

  subscribe = async (req: Request, res: Response): Promise<void> => {
    const body = newsletterSchema.parse(req.body);

    const emailService = getEmailService();
    const result = await emailService.sendNewsletterSubscriptionEmail(body.email);

    if (!result.success) {
      logger.error('Failed to send newsletter subscription email', { error: result.error });
      throw new AppError('INTERNAL_SERVER_ERROR', { message: `Newsletter subscription failed: ${result.error}` });
    }

    await this.responseHelper.success(
      res, 'success.newsletter.subscribed',
      { email: body.email, messageId: result.messageId },
      200, req
    );
  };
}
