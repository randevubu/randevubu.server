import { Router } from 'express';
import { AuthController } from '../../controllers/authController';
import prisma from '../../lib/prisma';
import { AuthMiddleware } from '../../middleware/auth';
import { requireAuth, withAuth } from '../../middleware/authUtils';
import { asyncHandler } from '../../utils/asyncHandler';
import { csrfMiddleware } from '../../middleware/csrf';
import { authRateLimit, strictRateLimit, refreshRateLimit } from '../../middleware/userRateLimit';
import { validateBody } from '../../middleware/validation';
import { RepositoryContainer } from '../../repositories';
import { dynamicCache, realTimeCache } from '../../middleware/cacheMiddleware';
import { trackCachePerformance } from '../../middleware/cacheMonitoring';
import {
  logoutSchema,
  sendVerificationSchema,
  verifyLoginSchema,
} from '../../schemas/auth.schemas';
import { ServiceContainer } from '../../services';
import { ResponseHelper } from '../../utils/responseHelper';
import { sendErrorResponse } from '../../utils/responseUtils';

// Initialize dependencies
const repositories = new RepositoryContainer(prisma);
const services = new ServiceContainer(repositories, prisma);
const responseHelper = new ResponseHelper(services.translationService);
const authController = new AuthController(
  services.authService,
  services.phoneVerificationService,
  services.tokenService,
  responseHelper,
  services.rbacService
);
const authMiddleware = new AuthMiddleware(
  repositories,
  services.tokenService,
  services.rbacService
);

const router = Router();

// Apply cache monitoring to all routes
router.use(trackCachePerformance);

const isDevelopment = process.env.NODE_ENV === 'development';

// Use Redis-backed, environment-independent rate limiters from userRateLimit.ts:
// authRateLimit   → 10 req / 15 min  (verify-login OTP only)
// refreshRateLimit → 60 req / min    (token refresh — automated, separate bucket)
// strictRateLimit  → 10 req / min    (send-verification)

// Authentication routes

/**
 * @swagger
 * /api/v1/auth/send-verification:
 *   post:
 *     tags: [Authentication]
 *     summary: Send phone verification code
 *     description: Send a 6-digit verification code to the provided phone number via SMS
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendVerificationRequest'
 *           examples:
 *             example:
 *               summary: Send verification code (auto-detects login/registration)
 *               value:
 *                 phoneNumber: "+1234567890"
 *     responses:
 *       200:
 *         description: Verification code sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SendVerificationResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RateLimitError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/send-verification',
  strictRateLimit,
  validateBody(sendVerificationSchema),
  asyncHandler(authController.sendVerificationCode)
);

/**
 * @swagger
 * /api/v1/auth/verify-login:
 *   post:
 *     tags: [Authentication]
 *     summary: Verify login code and authenticate
 *     description: Verify the 6-digit code and authenticate user, returning JWT tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyLoginRequest'
 *           example:
 *             phoneNumber: "+1234567890"
 *             verificationCode: "123456"
 *     responses:
 *       200:
 *         description: Login successful, user authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Invalid verification code or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RateLimitError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/verify-login',
  authRateLimit,
  validateBody(verifyLoginSchema),
  asyncHandler(authController.verifyLogin)
);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh access token
 *     description: Exchange a valid refresh token for a new access token pair
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenRefreshResponse'
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RateLimitError'
 */
router.post(
  '/refresh',
  refreshRateLimit,
  // No validation middleware - we handle token validation manually in controller
  asyncHandler(authController.refreshToken)
);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout user
 *     description: Revoke refresh tokens and logout the authenticated user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LogoutRequest'
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/logout',
  requireAuth,
  csrfMiddleware.verifyOriginHeader,
  validateBody(logoutSchema),
  asyncHandler(withAuth(authController.logout))
);

// DEV ONLY: Get latest verification code for a phone number
if (isDevelopment) {
  router.get('/dev/latest-code', async (req, res) => {
    const { phone } = req.query;
    if (!phone) {
      await sendErrorResponse(res, 'Telefon (phone) parametresi gerekli.', 400, { code: 'VALIDATION_ERROR' });
      return;
    }
    const record = await prisma.phoneVerification.findFirst({
      where: { phoneNumber: String(phone), isUsed: false },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) {
      await sendErrorResponse(res, 'Aktif doğrulama kodu bulunamadı.', 404, { code: 'NOT_FOUND' });
      return;
    }
    res.json({
      phoneNumber: record.phoneNumber,
      hashedCode: record.code,
      note: 'Code is hashed — check server logs for plain text code',
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
    });
  });
}

export default router;
