import request from 'supertest';
import express from 'express';
import { TestHelpers } from '../utils/testHelpers';
import { testUsers, mockJWTToken } from '../fixtures/testData';

// Mock the entire application
jest.mock('../../../src/index', () => ({
  app: express()
}));

describe('Authentication Security Tests', () => {
  let app: express.Application;

  beforeAll(async () => {
    // Set up test database
    await TestHelpers.cleanupDatabase();
    
    // Create Express app with security-focused routes
    app = express();
    app.use(express.json());
    
    // Mock authentication routes
    app.post('/api/v1/auth/send-verification', (req, res) => {
      const { phoneNumber } = req.body;
      
      // Simulate rate limiting
      if (req.headers['x-rate-limit-exceeded']) {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded'
        });
      }
      
      res.json({
        success: true,
        message: 'Verification code sent successfully'
      });
    });

    app.post('/api/v1/auth/register-login', (req, res) => {
      const { phoneNumber, verificationCode } = req.body;
      
      // Simulate brute force protection
      if (req.headers['x-brute-force-detected']) {
        return res.status(429).json({
          success: false,
          error: 'Too many failed attempts'
        });
      }
      
      if (phoneNumber === '+905551234567' && verificationCode === '123456') {
        res.json({
          success: true,
          data: {
            user: {
              id: 'user_1',
              phoneNumber,
              firstName: 'Test',
              lastName: 'User',
              isVerified: true,
              isActive: true
            },
            tokens: {
              accessToken: 'valid-access-token',
              refreshToken: 'valid-refresh-token'
            },
            isNewUser: true
          }
        });
      } else {
        res.status(401).json({
          success: false,
          error: 'Invalid verification code'
        });
      }
    });

    app.get('/api/v1/auth/profile', (req, res) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.includes('valid-access-token')) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      res.json({
        success: true,
        data: {
          id: 'user_1',
          phoneNumber: '+905551234567',
          firstName: 'Test',
          lastName: 'User',
          isVerified: true,
          isActive: true
        }
      });
    });

    app.post('/api/v1/auth/logout', (req, res) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.includes('valid-access-token')) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    });
  });

  afterAll(async () => {
    // Clean up test data
    await TestHelpers.cleanupDatabase();
  });

  describe('JWT Token Security', () => {
    it('should reject requests with no authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should reject requests with invalid token format', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'InvalidFormat token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject requests with malformed JWT tokens', async () => {
      const malformedTokens = [
        'Bearer invalid.jwt.token',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
        'Bearer not-a-jwt',
        'Bearer ',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.invalid-signature'
      ];

      for (const token of malformedTokens) {
        const response = await request(app)
          .get('/api/v1/auth/profile')
          .set('Authorization', token);

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      }
    });

    it('should reject expired tokens', async () => {
      const expiredToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAwMDB9.expired-signature';
      
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', expiredToken);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should accept valid tokens', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer valid-access-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Rate Limiting Security', () => {
    it('should implement rate limiting for verification code requests', async () => {
      const phoneNumber = '+905551234567';
      
      // Send multiple requests rapidly
      const requests = Array.from({ length: 10 }, () => 
        request(app)
          .post('/api/v1/auth/send-verification')
          .send({ phoneNumber, purpose: 'REGISTRATION' })
      );

      const responses = await Promise.all(requests);
      
      // At least one should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should implement rate limiting for login attempts', async () => {
      const loginData = {
        phoneNumber: '+905551234567',
        verificationCode: 'wrong-code'
      };

      // Send multiple failed login attempts
      const requests = Array.from({ length: 10 }, () => 
        request(app)
          .post('/api/v1/auth/register-login')
          .send(loginData)
      );

      const responses = await Promise.all(requests);
      
      // All should fail due to rate limiting
      responses.forEach(response => {
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Input Validation Security', () => {
    it('should reject SQL injection attempts in phone numbers', async () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; INSERT INTO users VALUES ('hacker', 'password'); --",
        "' UNION SELECT * FROM users --"
      ];

      for (const maliciousInput of maliciousInputs) {
        const response = await request(app)
          .post('/api/v1/auth/send-verification')
          .send({
            phoneNumber: maliciousInput,
            purpose: 'REGISTRATION'
          });

        // Should either reject the input or sanitize it
        expect(response.status).not.toBe(200);
      }
    });

    it('should reject XSS attempts in user input', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src="x" onerror="alert(\'XSS\')">',
        '"><script>alert("XSS")</script>'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/v1/auth/register-login')
          .send({
            phoneNumber: '+905551234567',
            verificationCode: payload
          });

        // Should reject or sanitize the payload
        expect(response.status).toBe(401);
      }
    });

    it('should handle extremely long input strings', async () => {
      const longString = 'A'.repeat(10000);
      
      const response = await request(app)
        .post('/api/v1/auth/send-verification')
        .send({
          phoneNumber: longString,
          purpose: 'REGISTRATION'
        });

      // Should reject or truncate the input
      expect(response.status).not.toBe(200);
    });

    it('should reject null and undefined values', async () => {
      const response = await request(app)
        .post('/api/v1/auth/send-verification')
        .send({
          phoneNumber: null,
          purpose: undefined
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Session Security', () => {
    it('should invalidate tokens on logout', async () => {
      // First, make a successful request
      const profileResponse = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer valid-access-token');

      expect(profileResponse.status).toBe(200);

      // Logout
      const logoutResponse = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer valid-access-token');

      expect(logoutResponse.status).toBe(200);

      // Try to use the same token after logout
      const profileAfterLogoutResponse = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer valid-access-token');

      expect(profileAfterLogoutResponse.status).toBe(401);
    });

    it('should handle concurrent requests with same token', async () => {
      const token = 'Bearer valid-access-token';
      
      // Make multiple concurrent requests with the same token
      const requests = Array.from({ length: 5 }, () => 
        request(app)
          .get('/api/v1/auth/profile')
          .set('Authorization', token)
      );

      const responses = await Promise.all(requests);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Authorization Security', () => {
    it('should prevent unauthorized access to protected endpoints', async () => {
      const protectedEndpoints = [
        { method: 'GET', path: '/api/v1/auth/profile' },
        { method: 'POST', path: '/api/v1/auth/logout' }
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request(app)
          [endpoint.method.toLowerCase() as keyof typeof request](endpoint.path);

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      }
    });

    it('should prevent privilege escalation', async () => {
      // Test that users cannot access other users' data
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer valid-access-token');

      expect(response.status).toBe(200);
      
      // Verify the response contains only the authenticated user's data
      expect(response.body.data.id).toBe('user_1');
      expect(response.body.data.phoneNumber).toBe('+905551234567');
    });

    it('should handle token tampering attempts', async () => {
      const tamperedTokens = [
        'Bearer valid-access-token.tampered',
        'Bearer valid-access-token.extra-data',
        'Bearer valid-access-token&malicious=payload'
      ];

      for (const token of tamperedTokens) {
        const response = await request(app)
          .get('/api/v1/auth/profile')
          .set('Authorization', token);

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('Data Protection Security', () => {
    it('should not expose sensitive information in error messages', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      
      // Should not expose internal details
      expect(response.body.error).not.toContain('database');
      expect(response.body.error).not.toContain('password');
      expect(response.body.error).not.toContain('secret');
    });

    it('should sanitize user data in responses', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer valid-access-token');

      expect(response.status).toBe(200);
      
      // Should not expose sensitive fields
      expect(response.body.data).not.toHaveProperty('password');
      expect(response.body.data).not.toHaveProperty('failedLoginAttempts');
      expect(response.body.data).not.toHaveProperty('lockedUntil');
      expect(response.body.data).not.toHaveProperty('internalId');
    });

    it('should handle special characters in phone numbers securely', async () => {
      const specialCharPhones = [
        '+905551234567',
        '+90 555 123 45 67',
        '+90-555-123-45-67',
        '+90.555.123.45.67'
      ];

      for (const phone of specialCharPhones) {
        const response = await request(app)
          .post('/api/v1/auth/send-verification')
          .send({
            phoneNumber: phone,
            purpose: 'REGISTRATION'
          });

        // Should handle normalization properly
        expect(response.status).toBe(200);
      }
    });
  });

  describe('Timing Attack Prevention', () => {
    it('should have consistent response times for invalid tokens', async () => {
      const invalidTokens = [
        'Bearer invalid-token-1',
        'Bearer invalid-token-2',
        'Bearer invalid-token-3'
      ];

      const startTimes: number[] = [];
      const endTimes: number[] = [];

      for (const token of invalidTokens) {
        const start = Date.now();
        await request(app)
          .get('/api/v1/auth/profile')
          .set('Authorization', token);
        const end = Date.now();
        
        startTimes.push(start);
        endTimes.push(end);
      }

      // Response times should be similar (within 100ms)
      const responseTimes = endTimes.map((end, i) => end - startTimes[i]);
      const maxTime = Math.max(...responseTimes);
      const minTime = Math.min(...responseTimes);
      
      expect(maxTime - minTime).toBeLessThan(100);
    });
  });
});


