/* import { config } from '../../../src/config/environment';

// Mock process.env
const originalEnv = process.env;

describe('Environment Configuration', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should have default values for development', () => {
    process.env.NODE_ENV = 'development';
    process.env.PORT = undefined;
    process.env.API_VERSION = undefined;

    // Re-import to get fresh config
    const { config: freshConfig } = require('../../../src/config/environment');

    expect(freshConfig.NODE_ENV).toBe('development');
    expect(freshConfig.PORT).toBe(3001);
    expect(freshConfig.API_VERSION).toBe('v1');
  });

  it('should use environment variables when provided', () => {
    process.env.NODE_ENV = 'production';
    process.env.PORT = '8080';
    process.env.API_VERSION = 'v2';

    // Re-import to get fresh config
    const { config: freshConfig } = require('../../../src/config/environment');

    expect(freshConfig.NODE_ENV).toBe('production');
    expect(freshConfig.PORT).toBe(8080);
    expect(freshConfig.API_VERSION).toBe('v2');
  });

  it('should have correct CORS origins for development', () => {
    process.env.NODE_ENV = 'development';

    // Re-import to get fresh config
    const { config: freshConfig } = require('../../../src/config/environment');

    expect(freshConfig.CORS_ORIGINS).toEqual([
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000'
    ]);
  });

  it('should have correct CORS origins for production', () => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGINS = 'https://example.com,https://app.example.com';

    // Re-import to get fresh config
    const { config: freshConfig } = require('../../../src/config/environment');

    expect(freshConfig.CORS_ORIGINS).toEqual([
      'https://example.com',
      'https://app.example.com'
    ]);
  });

  it('should have default CORS origins for production when not set', () => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGINS = undefined;

    // Re-import to get fresh config
    const { config: freshConfig } = require('../../../src/config/environment');

    expect(freshConfig.CORS_ORIGINS).toEqual(['https://yourdomain.com']);
  });

  it('should parse PORT as integer', () => {
    process.env.PORT = '9999';

    // Re-import to get fresh config
    const { config: freshConfig } = require('../../../src/config/environment');

    expect(freshConfig.PORT).toBe(9999);
    expect(typeof freshConfig.PORT).toBe('number');
  });

  it('should handle invalid PORT gracefully', () => {
    process.env.PORT = 'invalid';

    // Re-import to get fresh config
    const { config: freshConfig } = require('../../../src/config/environment');

    expect(freshConfig.PORT).toBe(NaN); // parseInt('invalid') returns NaN
  });
});
 */