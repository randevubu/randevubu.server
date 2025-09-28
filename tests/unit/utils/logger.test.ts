import { logger } from '../../../src/utils/logger';

// Mock winston
jest.mock('winston', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  };
  
  return {
    createLogger: jest.fn(() => mockLogger),
    format: {
      combine: jest.fn(),
      timestamp: jest.fn(),
      errors: jest.fn(),
      json: jest.fn(),
      prettyPrint: jest.fn(),
      colorize: jest.fn(),
      printf: jest.fn()
    },
    transports: {
      Console: jest.fn(),
      File: jest.fn()
    }
  };
});

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log info messages', () => {
    const message = 'Test info message';
    logger.info(message);
    
    expect(logger.info).toHaveBeenCalledWith(message);
  });

  it('should log error messages', () => {
    const message = 'Test error message';
    logger.error(message);
    
    expect(logger.error).toHaveBeenCalledWith(message);
  });

  it('should log warning messages', () => {
    const message = 'Test warning message';
    logger.warn(message);
    
    expect(logger.warn).toHaveBeenCalledWith(message);
  });

  it('should log debug messages', () => {
    const message = 'Test debug message';
    logger.debug(message);
    
    expect(logger.debug).toHaveBeenCalledWith(message);
  });

  it('should include timestamp in log messages', () => {
    const message = 'Test timestamp message';
    logger.info(message);
    
    expect(logger.info).toHaveBeenCalledWith(message);
  });

  it('should include service name in log messages', () => {
    const message = 'Test service message';
    logger.info(message);
    
    expect(logger.info).toHaveBeenCalledWith(message);
  });
});