import { createSuccessResponse, createErrorResponse } from '../../../src/utils/errorResponse';
import { ERROR_CODES } from '../../../src/constants/errorCodes';

describe('Error Response Utilities', () => {
  describe('createSuccessResponse', () => {
    it('should create success response with data', () => {
      const data = { id: '123', name: 'Test' };
      const response = createSuccessResponse(data);

      expect(response).toEqual({
        success: true,
        data: data,
        message: undefined,
        meta: undefined
      });
    });

    it('should create success response with message', () => {
      const data = { id: '123' };
      const message = 'Operation successful';
      const response = createSuccessResponse(data, message);

      expect(response).toEqual({
        success: true,
        data: data,
        message: message,
        meta: undefined
      });
    });

    it('should create success response with meta', () => {
      const data = { id: '123' };
      const message = 'Operation successful';
      const meta = { total: 100, page: 1 };
      const response = createSuccessResponse(data, message, meta);

      expect(response).toEqual({
        success: true,
        data: data,
        message: message,
        meta: meta
      });
    });

    it('should create success response without data', () => {
      const response = createSuccessResponse();

      expect(response).toEqual({
        success: true,
        data: undefined,
        message: undefined,
        meta: undefined
      });
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response with code', () => {
      const code = ERROR_CODES.BUSINESS_NOT_FOUND;
      const response = createErrorResponse(code);

      expect(response).toEqual({
        success: false,
        error: {
          code: code,
          key: 'errors.business.notFound',
          params: undefined,
          details: undefined,
          requestId: undefined
        }
      });
    });

    it('should create error response with code and params', () => {
      const code = ERROR_CODES.BUSINESS_NOT_FOUND;
      const params = { businessId: '123' };
      const response = createErrorResponse(code, params);

      expect(response).toEqual({
        success: false,
        error: {
          code: code,
          key: 'errors.business.notFound',
          params: params,
          details: undefined,
          requestId: undefined
        }
      });
    });

    it('should create error response with context', () => {
      const code = ERROR_CODES.BUSINESS_NOT_FOUND;
      const params = { businessId: '123' };
      const context = {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        requestId: 'req-123',
        timestamp: new Date(),
        endpoint: '/test',
        method: 'GET'
      };
      const response = createErrorResponse(code, params, context);

      expect(response).toEqual({
        success: false,
        error: {
          code: code,
          key: 'errors.business.notFound',
          params: params,
          details: context,
          requestId: context.requestId
        }
      });
    });
  });
});
