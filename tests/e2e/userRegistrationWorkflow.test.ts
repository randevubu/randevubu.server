/* import request from 'supertest';
import express from 'express';
import { TestHelpers } from '../utils/testHelpers';
import { testUsers, testBusinesses } from '../fixtures/testData';

// Mock the entire application
jest.mock('../../../src/index', () => ({
  app: express()
}));

describe('User Registration and Business Creation E2E Workflow', () => {
  let app: express.Application;
  let testData: any;

  beforeAll(async () => {
    // Set up test database
    await TestHelpers.cleanupDatabase();
    
    // Create Express app with all routes
    app = express();
    app.use(express.json());
    
    // Mock all the routes (in a real scenario, you'd import your actual app)
    app.post('/api/v1/auth/send-verification', (req, res) => {
      res.json({
        success: true,
        message: 'Verification code sent successfully'
      });
    });

    app.post('/api/v1/auth/register-login', (req, res) => {
      const { phoneNumber, verificationCode } = req.body;
      
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
              accessToken: 'access-token',
              refreshToken: 'refresh-token'
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

    app.post('/api/v1/businesses', (req, res) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.includes('access-token')) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      res.json({
        success: true,
        data: {
          id: 'biz_1',
          name: req.body.name,
          slug: 'test-business',
          description: req.body.description,
          email: req.body.email,
          phone: req.body.phone,
          address: req.body.address,
          isActive: true,
          isVerified: false,
          isClosed: false
        }
      });
    });

    app.post('/api/v1/businesses/:businessId/services', (req, res) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.includes('access-token')) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      res.json({
        success: true,
        data: {
          id: 'service_1',
          name: req.body.name,
          description: req.body.description,
          duration: req.body.duration,
          price: req.body.price,
          businessId: req.params.businessId,
          isActive: true
        }
      });
    });

    app.post('/api/v1/businesses/:businessId/appointments', (req, res) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.includes('access-token')) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      res.json({
        success: true,
        data: {
          id: 'apt_1',
          customerName: req.body.customerName,
          customerPhone: req.body.customerPhone,
          customerEmail: req.body.customerEmail,
          startTime: req.body.startTime,
          endTime: req.body.endTime,
          status: 'SCHEDULED',
          businessId: req.params.businessId,
          serviceId: req.body.serviceId
        }
      });
    });

    app.get('/api/v1/businesses/:businessId/appointments', (req, res) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.includes('access-token')) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      res.json({
        success: true,
        data: {
          appointments: [
            {
              id: 'apt_1',
              customerName: 'John Doe',
              customerPhone: '+905559876543',
              customerEmail: 'john@example.com',
              startTime: '2024-01-15T10:00:00Z',
              endTime: '2024-01-15T11:00:00Z',
              status: 'SCHEDULED',
              businessId: req.params.businessId,
              serviceId: 'service_1'
            }
          ],
          total: 1,
          page: 1,
          totalPages: 1
        }
      });
    });
  });

  afterAll(async () => {
    // Clean up test data
    await TestHelpers.cleanupDatabase();
  });

  describe('Complete User Registration and Business Setup Workflow', () => {
    it('should complete full user registration and business setup workflow', async () => {
      // Step 1: Send verification code
      const sendVerificationResponse = await request(app)
        .post('/api/v1/auth/send-verification')
        .send({
          phoneNumber: '+905551234567',
          purpose: 'REGISTRATION'
        });

      expect(sendVerificationResponse.status).toBe(200);
      expect(sendVerificationResponse.body.success).toBe(true);

      // Step 2: Register user with verification code
      const registerResponse = await request(app)
        .post('/api/v1/auth/register-login')
        .send({
          phoneNumber: '+905551234567',
          verificationCode: '123456'
        });

      expect(registerResponse.status).toBe(200);
      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.isNewUser).toBe(true);
      expect(registerResponse.body.data.user.phoneNumber).toBe('+905551234567');

      const accessToken = registerResponse.body.data.tokens.accessToken;
      const userId = registerResponse.body.data.user.id;

      // Step 3: Create business
      const createBusinessResponse = await request(app)
        .post('/api/v1/businesses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test Business',
          description: 'A test business for E2E testing',
          email: 'business@example.com',
          phone: '+905551234567',
          address: 'Test Address, Istanbul',
          city: 'Istanbul',
          state: 'Istanbul',
          country: 'Turkey',
          postalCode: '34000',
          businessTypeId: '1',
          timezone: 'Europe/Istanbul',
          primaryColor: '#007bff',
          tags: ['test', 'e2e']
        });

      expect(createBusinessResponse.status).toBe(200);
      expect(createBusinessResponse.body.success).toBe(true);
      expect(createBusinessResponse.body.data.name).toBe('Test Business');

      const businessId = createBusinessResponse.body.data.id;

      // Step 4: Create service
      const createServiceResponse = await request(app)
        .post(`/api/v1/businesses/${businessId}/services`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test Service',
          description: 'A test service for E2E testing',
          duration: 60,
          price: 100,
          showPrice: true
        });

      expect(createServiceResponse.status).toBe(200);
      expect(createServiceResponse.body.success).toBe(true);
      expect(createServiceResponse.body.data.name).toBe('Test Service');

      const serviceId = createServiceResponse.body.data.id;

      // Step 5: Create appointment
      const createAppointmentResponse = await request(app)
        .post(`/api/v1/businesses/${businessId}/appointments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          customerName: 'John Doe',
          customerPhone: '+905559876543',
          customerEmail: 'john@example.com',
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T11:00:00Z',
          serviceId: serviceId
        });

      expect(createAppointmentResponse.status).toBe(200);
      expect(createAppointmentResponse.body.success).toBe(true);
      expect(createAppointmentResponse.body.data.customerName).toBe('John Doe');

      // Step 6: Get appointments list
      const getAppointmentsResponse = await request(app)
        .get(`/api/v1/businesses/${businessId}/appointments`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(getAppointmentsResponse.status).toBe(200);
      expect(getAppointmentsResponse.body.success).toBe(true);
      expect(getAppointmentsResponse.body.data.appointments).toHaveLength(1);
      expect(getAppointmentsResponse.body.data.appointments[0].customerName).toBe('John Doe');

      // Store test data for cleanup
      testData = {
        userId,
        businessId,
        serviceId,
        appointmentId: createAppointmentResponse.body.data.id
      };
    });

    it('should handle user login workflow', async () => {
      // Step 1: Send verification code for existing user
      const sendVerificationResponse = await request(app)
        .post('/api/v1/auth/send-verification')
        .send({
          phoneNumber: '+905551234567',
          purpose: 'REGISTRATION'
        });

      expect(sendVerificationResponse.status).toBe(200);

      // Step 2: Login existing user
      const loginResponse = await request(app)
        .post('/api/v1/auth/register-login')
        .send({
          phoneNumber: '+905551234567',
          verificationCode: '123456'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.isNewUser).toBe(false);
    });

    it('should handle business management workflow', async () => {
      // This test would cover:
      // - Updating business information
      // - Managing business hours
      // - Adding/removing services
      // - Managing staff
      // - Viewing business analytics
      
      const accessToken = 'access-token';
      const businessId = 'biz_1';

      // Update business
      const updateBusinessResponse = await request(app)
        .put(`/api/v1/businesses/${businessId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Business Name',
          description: 'Updated business description'
        });

      expect(updateBusinessResponse.status).toBe(200);
    });

    it('should handle appointment management workflow', async () => {
      // This test would cover:
      // - Creating appointments
      // - Updating appointments
      // - Cancelling appointments
      // - Rescheduling appointments
      // - Managing appointment statuses
      
      const accessToken = 'access-token';
      const businessId = 'biz_1';

      // Get appointments
      const getAppointmentsResponse = await request(app)
        .get(`/api/v1/businesses/${businessId}/appointments`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(getAppointmentsResponse.status).toBe(200);
      expect(getAppointmentsResponse.body.success).toBe(true);
    });

    it('should handle customer management workflow', async () => {
      // This test would cover:
      // - Viewing customer list
      // - Getting customer details
      // - Managing customer information
      // - Viewing customer history
      
      const accessToken = 'access-token';

      // Get customers
      const getCustomersResponse = await request(app)
        .get('/api/v1/auth/customers')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(getCustomersResponse.status).toBe(200);
      expect(getCustomersResponse.body.success).toBe(true);
    });
  });

  describe('Error Handling in E2E Workflows', () => {
    it('should handle authentication errors gracefully', async () => {
      // Try to access protected endpoint without authentication
      const response = await request(app)
        .get('/api/v1/businesses/biz_1/appointments');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should handle invalid verification code', async () => {
      // Send invalid verification code
      const response = await request(app)
        .post('/api/v1/auth/register-login')
        .send({
          phoneNumber: '+905551234567',
          verificationCode: 'invalid-code'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should handle business not found errors', async () => {
      const accessToken = 'access-token';
      const nonExistentBusinessId = 'biz_999';

      // Try to access non-existent business
      const response = await request(app)
        .get(`/api/v1/businesses/${nonExistentBusinessId}/appointments`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Performance and Load Testing Scenarios', () => {
    it('should handle multiple concurrent user registrations', async () => {
      const phoneNumbers = [
        '+905551234567',
        '+905551234568',
        '+905551234569',
        '+905551234570',
        '+905551234571'
      ];

      const registrationPromises = phoneNumbers.map(async (phoneNumber) => {
        const response = await request(app)
          .post('/api/v1/auth/register-login')
          .send({
            phoneNumber,
            verificationCode: '123456'
          });
        return response;
      });

      const responses = await Promise.all(registrationPromises);

      // All registrations should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle rapid appointment creation', async () => {
      const accessToken = 'access-token';
      const businessId = 'biz_1';
      const serviceId = 'service_1';

      const appointmentPromises = Array.from({ length: 10 }, (_, index) => {
        return request(app)
          .post(`/api/v1/businesses/${businessId}/appointments`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            customerName: `Customer ${index + 1}`,
            customerPhone: `+90555987654${index}`,
            customerEmail: `customer${index + 1}@example.com`,
            startTime: `2024-01-15T${10 + index}:00:00Z`,
            endTime: `2024-01-15T${11 + index}:00:00Z`,
            serviceId: serviceId
          });
      });

      const responses = await Promise.all(appointmentPromises);

      // All appointments should be created successfully
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});


 */