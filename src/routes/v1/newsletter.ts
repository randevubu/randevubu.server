import { Router } from 'express';
import { NewsletterController } from '../../controllers/newsletterController';
import { trackCachePerformance } from '../../middleware/cacheMonitoring';
import { createUserRateLimiter } from '../../middleware/userRateLimit';

const rateLimiter = createUserRateLimiter({
  maxRequests: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: 'Çok fazla bülten aboneliği isteği gönderdiniz. Lütfen bir saat sonra tekrar deneyin.',
  skipSuccessfulRequests: false,
  keyPrefix: 'newsletter_subscribe_rate_limit',
});

export function createNewsletterRoutes(controller: NewsletterController): Router {
  const router = Router();

  // Apply cache monitoring
  router.use(trackCachePerformance);

  /**
   * @swagger
   * /api/v1/newsletter:
   *   post:
   *     tags: [Newsletter]
   *     summary: Subscribe to newsletter
   *     description: Register a new email address for product updates and blog posts
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 example: "ornek@example.com"
   *                 description: Subscriber email address
   *     responses:
   *       200:
   *         description: Subscription email sent successfully
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
   *                   example: "Bülten aboneliğiniz başarıyla kaydedildi."
   *                 data:
   *                   type: object
   *                   properties:
   *                     email:
   *                       type: string
   *                       example: "ornek@example.com"
   *                     messageId:
   *                       type: string
   *       400:
   *         description: Invalid email
   *       500:
   *         description: Internal server error
   */
  router.post('/', rateLimiter.middleware, controller.subscribe.bind(controller));

  return router;
}

export default createNewsletterRoutes;

