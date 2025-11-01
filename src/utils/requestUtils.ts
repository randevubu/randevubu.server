/**
 * Request Utility Functions
 * 
 * Provides utilities for extracting information from Express requests
 * and creating standardized context objects for logging and error handling.
 */

import { Request } from 'express';
import { ErrorContext } from '../types/errors';
import { DeviceInfo } from '../types/auth';

/**
 * Extract device information from request headers
 */
export function extractDeviceInfo(req: Request): DeviceInfo {
  return {
    deviceId: req.headers['x-device-id'] as string,
    userAgent: req.get('user-agent'),
    ipAddress: req.ip,
  };
}

/**
 * Create error context for logging and error handling
 */
export function createErrorContext(req: Request, userId?: string): ErrorContext {
  return {
    userId,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.requestId || Math.random().toString(36).substring(7),
    timestamp: new Date(),
    endpoint: req.path,
    method: req.method,
  };
}

/**
 * Extract user information from authenticated request
 */
export function extractUserInfo(req: Request): { userId?: string; userRoles?: string[] } {
  const user = (req as any).user;
  return {
    userId: user?.id,
    userRoles: user?.roles?.map((role: any) => role.name),
  };
}

/**
 * Get client IP address with proper fallback
 */
export function getClientIp(req: Request): string {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress || 
         (req.connection as any)?.socket?.remoteAddress || 
         'unknown';
}

/**
 * Check if request is from a mobile device
 */
export function isMobileRequest(req: Request): boolean {
  const userAgent = req.get('user-agent') || '';
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
}

/**
 * Check if request is from a bot/crawler
 */
export function isBotRequest(req: Request): boolean {
  const userAgent = req.get('user-agent') || '';
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /Googlebot/i, /Bingbot/i, /Slurp/i, /DuckDuckBot/i,
    /Baiduspider/i, /YandexBot/i, /facebookexternalhit/i
  ];
  return botPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * Get request fingerprint for rate limiting and security
 */
export function getRequestFingerprint(req: Request): string {
  const ip = getClientIp(req);
  const userAgent = req.get('user-agent') || '';
  const deviceId = req.headers['x-device-id'] as string || '';
  
  return `${ip}:${userAgent}:${deviceId}`;
}
