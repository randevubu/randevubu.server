import { Request, Response } from 'express';
import { z } from 'zod';

import { AppError } from '../types/responseTypes';
import { getEmailService } from '../lib/aws/email';
import { ResponseHelper } from '../utils/responseHelper';
import logger from '../utils/Logger/logger';

const contactFormSchema = z.object({
  name: z
    .string()
    .min(2, 'Ad en az 2 karakter olmalıdır')
    .max(100, 'Ad en fazla 100 karakter olabilir'),
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  phone: z.string().min(10, 'Geçerli bir telefon numarası giriniz').max(20),
  subject: z.string().min(3, 'Konu en az 3 karakter olmalıdır').max(200),
  message: z.string().min(10, 'Mesaj en az 10 karakter olmalıdır').max(2000),
});

export class ContactController {
  constructor(private responseHelper: ResponseHelper) {}

  sendContactMessage = async (req: Request, res: Response): Promise<void> => {
    const body = contactFormSchema.parse(req.body);

    const emailService = getEmailService();
    const result = await emailService.sendContactFormEmail(
      body.name, body.email, body.phone, body.subject, body.message
    );

    if (!result.success) {
      logger.error('Failed to send contact email', { error: result.error });
      throw new AppError('INTERNAL_SERVER_ERROR', { message: `Contact email failed: ${result.error}` });
    }

    await this.responseHelper.success(res, 'success.contact.sent', { messageId: result.messageId }, 200, req);
  };
}
