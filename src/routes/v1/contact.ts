import { Router } from 'express';
import { ContactController } from '../../controllers/contactController';
import { createUserRateLimiter } from '../../middleware/userRateLimit';
import { trackCachePerformance } from '../../middleware/cacheMonitoring';

const rateLimiter = createUserRateLimiter({
  maxRequests: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: 'Çok fazla istek gönderdiniz. Lütfen birkaç dakika sonra tekrar deneyin.',
  skipSuccessfulRequests: false,
  keyPrefix: 'contact_form_rate_limit',
});

export function createContactRoutes(controller: ContactController): Router {
  const router = Router();

  // Apply cache monitoring
  router.use(trackCachePerformance);

  /**
   * @swagger
   * /api/v1/contact:
   *   post:
   *     tags: [Contact]
   *     summary: Send contact form message
   *     description: Submit a contact form message via email
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - email
   *               - phone
   *               - subject
   *               - message
   *             properties:
   *               name:
   *                 type: string
   *                 minLength: 2
   *                 maxLength: 100
   *                 example: "Ahmet Yılmaz"
   *                 description: Sender's full name
   *               email:
   *                 type: string
   *                 format: email
   *                 example: "ahmet@example.com"
   *                 description: Sender's email address
   *               phone:
   *                 type: string
   *                 minLength: 10
   *                 maxLength: 20
   *                 example: "05551234567"
   *                 description: Sender's phone number
   *               subject:
   *                 type: string
   *                 minLength: 3
   *                 maxLength: 200
   *                 example: "Destek Talebi"
   *                 description: Message subject
   *               message:
   *                 type: string
   *                 minLength: 10
   *                 maxLength: 2000
   *                 example: "Merhaba, randevu sisteminiz hakkında bilgi almak istiyorum."
   *                 description: Message content
   *     responses:
   *       200:
   *         description: Message sent successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız."
   *                 data:
   *                   type: object
   *                   properties:
   *                     messageId:
   *                       type: string
   *                       example: "0100018e-1234-4567-abcd-123456789012-000000"
   *       400:
   *         description: Invalid input data
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: "Geçersiz form verisi"
   *                 error:
   *                   type: object
   *       429:
   *         description: Too many requests
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: "Çok fazla istek gönderdiniz. Lütfen birkaç dakika sonra tekrar deneyin."
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: "Mesaj gönderilemedi"
   */
  router.post(
    '/',
    rateLimiter.middleware,
    controller.sendContactMessage.bind(controller)
  );

  return router;
}

export default createContactRoutes;
