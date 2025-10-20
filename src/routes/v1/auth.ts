import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../../controllers/authController';
import prisma from '../../lib/prisma';
import { AuthMiddleware } from '../../middleware/auth';
import { requireAuth, withAuth } from '../../middleware/authUtils';
import { csrfMiddleware } from '../../middleware/csrf';
import { validateBody } from '../../middleware/validation';
import { RepositoryContainer } from '../../repositories';
import { dynamicCache, realTimeCache } from '../../middleware/cacheMiddleware';
import { trackCachePerformance } from '../../middleware/cacheMonitoring';
import {
  logoutSchema,
  sendVerificationSchema,
  verifyLoginSchema
} from '../../schemas/auth.schemas';
import { ServiceContainer } from '../../services';

// Initialize dependencies
const repositories = new RepositoryContainer(prisma);
const services = new ServiceContainer(repositories, prisma);
const authController = new AuthController(
  services.authService,
  services.phoneVerificationService,
  services.tokenService,
  services.rbacService
);
const authMiddleware = new AuthMiddleware(repositories, services.tokenService, services.rbacService);

const router = Router();

// Apply cache monitoring to all routes
router.use(trackCachePerformance);

// Rate limiting - More relaxed in development
const isDevelopment = process.env.NODE_ENV === 'development';

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 100 : 10, // Much higher limit in dev
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts from this IP, please try again later.',
      retryAfter: '15 minutes',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const verificationRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: isDevelopment ? 50 : 10, // Increased from 3 to 10 in production
  message: {
    success: false,
    error: {
      message: 'Too many verification code requests, please try again later.',
      retryAfter: '5 minutes',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

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
 *             registration:
 *               summary: Registration verification
 *               value:
 *                 phoneNumber: "+1234567890"
 *                 purpose: "REGISTRATION"
 *             login:
 *               summary: Login verification
 *               value:
 *                 phoneNumber: "+1234567890"
 *                 purpose: "LOGIN"
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
  verificationRateLimit,
  validateBody(sendVerificationSchema),
  authController.sendVerificationCode
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
  authController.verifyLogin
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
  authRateLimit,
  // No validation middleware - we handle token validation manually in controller
  authController.refreshToken
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
  // CSRF not required for logout - it's a safe operation that only invalidates user's own session
  // csrfMiddleware.requireCSRF,
  validateBody(logoutSchema),
  withAuth((req, res, next) => {
    return authController.logout(req, res).catch(next);
  })
);







export default router;