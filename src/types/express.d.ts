import { AuthenticatedUser, JWTPayload } from './auth';

declare namespace Express {
  interface Request {
    startTime: number;
    user?: AuthenticatedUser;
    token?: JWTPayload;
    businessContext?: {
      businessId: string;
      userRole: string;
      hasAccess: boolean;
    };
  }
}