import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { RepositoryContainer } from '../../repositories';
import { ServiceContainer } from '../../services';
import { AuthController } from '../../controllers/authController';
import { AuthMiddleware, rateLimitByUser } from '../../middleware/auth';
import { validateBody } from '../../middleware/validation';
import { 
  sendVerificationSchema,
  verifyLoginSchema,
  refreshTokenSchema,
  logoutSchema,
  updateProfileSchema,
  changePhoneSchema
} from '../../schemas/auth.schemas';
import prisma from '../../lib/prisma';

// Initialize dependencies
const repositories = new RepositoryContainer(prisma);
const services = new ServiceContainer(repositories);
const authController = new AuthController(
  services.authService,
  services.phoneVerificationService,
  services.tokenService
);
const authMiddleware = new AuthMiddleware(repositories, services.tokenService, services.rbacService);

const router = Router();

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
  max: isDevelopment ? 50 : 3, // Much higher limit in dev for testing
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
  authMiddleware.authenticate,
  validateBody(logoutSchema),
  authController.logout
);

/**
 * @swagger
 * /api/v1/auth/profile:
 *   get:
 *     tags: [User Management]
 *     summary: Get user profile
 *     description: Retrieve the authenticated user's profile information
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProfileResponse'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/profile',
  authMiddleware.authenticate,
  authController.getProfile
);

/**
 * @swagger
 * /api/v1/auth/profile:
 *   patch:
 *     tags: [User Management]
 *     summary: Update user profile
 *     description: Update the authenticated user's profile information
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *           example:
 *             firstName: "John"
 *             lastName: "Doe"
 *             timezone: "America/New_York"
 *             language: "en"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProfileResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch(
  '/profile',
  authMiddleware.authenticate,
  rateLimitByUser(20, 15 * 60 * 1000),
  validateBody(updateProfileSchema),
  authController.updateProfile
);

/**
 * @swagger
 * /api/v1/auth/change-phone:
 *   post:
 *     tags: [User Management]
 *     summary: Change user's phone number
 *     description: Change the authenticated user's phone number using a verification code
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePhoneRequest'
 *     responses:
 *       200:
 *         description: Phone changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/change-phone',
  authMiddleware.authenticate,
  authRateLimit,
  validateBody(changePhoneSchema),
  authController.changePhone
);

/**
 * @swagger
 * /api/v1/auth/account:
 *   delete:
 *     tags: [User Management]
 *     summary: Delete user account
 *     description: Permanently delete the authenticated user's account
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
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
router.delete(
  '/account',
  authMiddleware.authenticate,
  authRateLimit,
  authController.deleteAccount
);

/**
 * @swagger
 * /api/v1/auth/stats:
 *   get:
 *     tags: [User Management]
 *     summary: Get authentication stats
 *     description: Retrieve rate-limited stats for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stats retrieved
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
router.get(
  '/stats',
  authMiddleware.authenticate,
  rateLimitByUser(5, 60 * 1000),
  authController.getStats
);

export default router;