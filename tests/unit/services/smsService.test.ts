import { SMSService, SMSSendOptions, SMSResponse } from '../../../src/services/smsService';
import { logger } from '../../../src/utils/logger';

// Mock logger
jest.mock('../../../src/utils/logger');

// Mock fetch
global.fetch = jest.fn();

describe('SMSService', () => {
  let smsService: SMSService;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env };
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up environment variables
    process.env.ILETI_MERKEZI_API_KEY = 'test-api-key';
    process.env.ILETI_MERKEZI_SECRET_KEY = 'test-secret-key';
    process.env.ILETI_MERKEZI_SENDER = 'TEST';
    
    // Create SMSService instance
    smsService = new SMSService();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should create SMSService instance with credentials', () => {
      expect(smsService).toBeInstanceOf(SMSService);
    });

    it('should warn when credentials are not configured', () => {
      // Clear environment variables
      delete process.env.ILETI_MERKEZI_API_KEY;
      delete process.env.ILETI_MERKEZI_SECRET_KEY;
      
      // Create new instance
      new SMSService();
      
      expect(logger.warn).toHaveBeenCalledWith('SMS API credentials not configured. SMS sending will be disabled.');
    });
  });

  describe('sendSMS', () => {
    const mockOptions: SMSSendOptions = {
      phoneNumber: '05551234567',
      message: 'Test message',
      context: { requestId: 'test-123' }
    };

    it('should send SMS successfully', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(`
          <response>
            <code>200</code>
            <message>Success</message>
            <id>12345</id>
          </response>
        `)
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await smsService.sendSMS(mockOptions);

      // Assert
      expect(result).toEqual({
        success: true,
        messageId: '12345'
      });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.iletimerkezi.com'),
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/xml'
          }
        })
      );
    });

    it('should handle API error response', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(`
          <response>
            <code>400</code>
            <message>Invalid phone number</message>
          </response>
        `)
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await smsService.sendSMS(mockOptions);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'API Error 400: Invalid phone number'
      });
    });

    it('should handle HTTP error response', async () => {
      // Arrange
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValue('Server Error')
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await smsService.sendSMS(mockOptions);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'API request failed: 500 Internal Server Error'
      });
    });

    it('should return error when credentials not configured', async () => {
      // Arrange
      delete process.env.ILETI_MERKEZI_API_KEY;
      const smsServiceWithoutCreds = new SMSService();

      // Act
      const result = await smsServiceWithoutCreds.sendSMS(mockOptions);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'SMS service not configured'
      });
    });

    it('should return error for invalid phone number format', async () => {
      // Arrange
      const invalidOptions = {
        ...mockOptions,
        phoneNumber: 'invalid-phone'
      };

      // Act
      const result = await smsService.sendSMS(invalidOptions);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Invalid phone number format'
      });
    });

    it('should handle network error', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      // Act
      const result = await smsService.sendSMS(mockOptions);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Network error'
      });
    });

    it('should handle XML parsing error', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('Invalid XML response')
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await smsService.sendSMS(mockOptions);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Failed to parse API response'
      });
    });
  });

  describe('normalizePhoneNumber', () => {
    it('should normalize phone number with country code', () => {
      const result = (smsService as any).normalizePhoneNumber('905551234567');
      expect(result).toBe('5551234567');
    });

    it('should normalize phone number with leading zero', () => {
      const result = (smsService as any).normalizePhoneNumber('05551234567');
      expect(result).toBe('5551234567');
    });

    it('should return phone number already in correct format', () => {
      const result = (smsService as any).normalizePhoneNumber('5551234567');
      expect(result).toBe('5551234567');
    });

    it('should return null for invalid phone number', () => {
      const result = (smsService as any).normalizePhoneNumber('123');
      expect(result).toBeNull();
    });

    it('should return null for phone number without country code', () => {
      const result = (smsService as any).normalizePhoneNumber('1234567890');
      expect(result).toBeNull();
    });

    it('should handle error during normalization', () => {
      // Mock console.warn to avoid test output
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = (smsService as any).normalizePhoneNumber(null);
      expect(result).toBeNull();
      
      consoleSpy.mockRestore();
    });
  });

  describe('createHash', () => {
    it('should return secret key as hash', () => {
      const result = (smsService as any).createHash('api-key', 'secret-key');
      expect(result).toBe('secret-key');
    });
  });

  describe('parseXMLResponse', () => {
    it('should parse successful XML response', () => {
      const xmlResponse = `
        <response>
          <code>200</code>
          <message>Success</message>
          <id>12345</id>
        </response>
      `;

      const result = (smsService as any).parseXMLResponse(xmlResponse);
      expect(result).toEqual({
        success: true,
        messageId: '12345'
      });
    });

    it('should parse error XML response', () => {
      const xmlResponse = `
        <response>
          <code>400</code>
          <message>Invalid request</message>
        </response>
      `;

      const result = (smsService as any).parseXMLResponse(xmlResponse);
      expect(result).toEqual({
        success: false,
        error: 'API Error 400: Invalid request'
      });
    });

    it('should handle malformed XML response', () => {
      const xmlResponse = 'Invalid XML';

      const result = (smsService as any).parseXMLResponse(xmlResponse);
      expect(result).toEqual({
        success: false,
        error: 'API Error 0: '
      });
    });

    it('should handle XML parsing error', () => {
      // Mock logger.error to avoid test output
      const loggerSpy = jest.spyOn(logger, 'error').mockImplementation();
      
      const result = (smsService as any).parseXMLResponse(null);
      expect(result).toEqual({
        success: false,
        error: 'Failed to parse API response'
      });
      
      loggerSpy.mockRestore();
    });
  });

  describe('maskPhoneNumber', () => {
    it('should mask phone number correctly', () => {
      const result = (smsService as any).maskPhoneNumber('5551234567');
      expect(result).toBe('*******567');
    });

    it('should mask short phone number', () => {
      const result = (smsService as any).maskPhoneNumber('123');
      expect(result).toBe('***');
    });

    it('should mask very short phone number', () => {
      const result = (smsService as any).maskPhoneNumber('12');
      expect(result).toBe('**');
    });
  });

  describe('testSMS', () => {
    it('should send test SMS successfully', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(`
          <response>
            <code>200</code>
            <message>Success</message>
            <id>test-123</id>
          </response>
        `)
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await smsService.testSMS('05551234567');

      // Assert
      expect(result).toEqual({
        success: true,
        messageId: 'test-123'
      });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('RandevuBu SMS servisi test mesajıdır'),
        expect.any(Object)
      );
    });

    it('should handle test SMS failure', async () => {
      // Arrange
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValue('Server Error')
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await smsService.testSMS('05551234567');

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'API request failed: 500 Internal Server Error'
      });
    });
  });

  describe('URL encoding', () => {
    it('should properly encode message with special characters', async () => {
      // Arrange
      const optionsWithSpecialChars = {
        ...mockOptions,
        message: 'Test message with special chars: üğşçöı'
      };

      const mockResponse = {
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(`
          <response>
            <code>200</code>
            <message>Success</message>
            <id>12345</id>
          </response>
        `)
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      await smsService.sendSMS(optionsWithSpecialChars);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent('Test message with special chars: üğşçöı')),
        expect.any(Object)
      );
    });
  });

  describe('logging', () => {
    it('should log SMS sending attempt', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(`
          <response>
            <code>200</code>
            <message>Success</message>
            <id>12345</id>
          </response>
        `)
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      await smsService.sendSMS(mockOptions);

      // Assert
      expect(logger.info).toHaveBeenCalledWith(
        'Sending SMS via İleti Merkezi',
        expect.objectContaining({
          phoneNumber: expect.stringContaining('***'),
          messageLength: mockOptions.message.length,
          sender: 'TEST',
          requestId: 'test-123'
        })
      );
    });

    it('should log successful SMS delivery', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(`
          <response>
            <code>200</code>
            <message>Success</message>
            <id>12345</id>
          </response>
        `)
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      await smsService.sendSMS(mockOptions);

      // Assert
      expect(logger.info).toHaveBeenCalledWith(
        'SMS sent successfully',
        expect.objectContaining({
          phoneNumber: expect.stringContaining('***'),
          messageId: '12345',
          requestId: 'test-123'
        })
      );
    });

    it('should log SMS sending failure', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(`
          <response>
            <code>400</code>
            <message>Invalid phone number</message>
          </response>
        `)
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      await smsService.sendSMS(mockOptions);

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        'SMS sending failed',
        expect.objectContaining({
          phoneNumber: expect.stringContaining('***'),
          error: 'API Error 400: Invalid phone number',
          requestId: 'test-123'
        })
      );
    });
  });
});

