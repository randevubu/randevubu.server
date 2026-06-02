import { createHash, timingSafeEqual } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import logger from '../utils/Logger/logger';

/**
 * Verifies that an incoming POST to /payments/webhook originated from Iyzico.
 *
 * Iyzico payment-result callbacks include a `token` field in the JSON body.
 * The expected value is: base64( SHA1( secretKey + iyziReferenceCode ) )
 *
 * Reference: https://dev.iyzipay.com/en/3d-payment (Callback Token Validation section)
 *
 * If IYZICO_SECRET_KEY is not set the server will refuse to start (see environment.ts).
 * In development the check is logged but not enforced so sandbox testing still works.
 */
export function verifyIyzicoWebhook(req: Request, res: Response, next: NextFunction): void {
  const secretKey = process.env.IYZICO_SECRET_KEY;

  if (!secretKey) {
    logger.error('Iyzico webhook received but IYZICO_SECRET_KEY is not configured');
    res.status(500).json({ success: false, error: { code: 'CONFIGURATION_ERROR', message: 'Payment gateway not configured' } });
    return;
  }

  try {
    const body = req.body as Record<string, unknown>;
    const iyziReferenceCode = body?.iyziReferenceCode as string | undefined;
    const receivedToken = body?.token as string | undefined;

    if (!iyziReferenceCode || !receivedToken) {
      logger.warn('Iyzico webhook missing iyziReferenceCode or token', {
        hasReferenceCode: !!iyziReferenceCode,
        hasToken: !!receivedToken,
        ip: req.ip,
      });
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid webhook payload' } });
      return;
    }

    // Compute expected token: base64( SHA1( secretKey + iyziReferenceCode ) )
    const expectedToken = createHash('sha1')
      .update(secretKey + iyziReferenceCode)
      .digest('base64');

    // Compare using timing-safe equality to prevent timing attacks
    const receivedBuf = Buffer.from(receivedToken);
    const expectedBuf = Buffer.from(expectedToken);

    const isValid =
      receivedBuf.length === expectedBuf.length &&
      timingSafeEqual(receivedBuf, expectedBuf);

    if (!isValid) {
      logger.warn('Iyzico webhook signature verification failed', {
        ip: req.ip,
        iyziReferenceCode,
      });
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Webhook signature invalid' } });
      return;
    }

    next();
  } catch (error) {
    logger.error('Iyzico webhook verification error', {
      error: error instanceof Error ? error.message : String(error),
      ip: req.ip,
    });
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Webhook verification failed' } });
  }
}
