import { Request, Response, NextFunction } from 'express';
import { BusinessContextMiddleware, BusinessContextRequest } from './businessContext';
import { RepositoryContainer } from '../repositories';

let businessContextMiddleware: BusinessContextMiddleware;

export function initializeBusinessContextMiddleware(repositories: RepositoryContainer) {
  businessContextMiddleware = new BusinessContextMiddleware(repositories.prismaClient);
}

export const attachBusinessContext = (req: Request, res: Response, next: NextFunction) => {
  console.log('🔍 attachBusinessContext wrapper called for user:', (req as any).user?.id);
  if (!businessContextMiddleware) {
    console.log('❌ Business context middleware not initialized');
    return next(new Error('Business context middleware not initialized'));
  }
  
  return businessContextMiddleware.attachBusinessContext(req as BusinessContextRequest, res, next);
};

export const requireBusinessAccess = (req: Request, res: Response, next: NextFunction) => {
  if (!businessContextMiddleware) {
    return next(new Error('Business context middleware not initialized'));
  }
  
  return businessContextMiddleware.requireBusinessAccess(req as BusinessContextRequest, res, next);
};

export const requireBusinessOwner = (req: Request, res: Response, next: NextFunction) => {
  if (!businessContextMiddleware) {
    return next(new Error('Business context middleware not initialized'));
  }
  
  return businessContextMiddleware.requireBusinessOwner(req as BusinessContextRequest, res, next);
};

export const requireBusinessContext = (req: Request, res: Response, next: NextFunction) => {
  if (!businessContextMiddleware) {
    return next(new Error('Business context middleware not initialized'));
  }
  
  return businessContextMiddleware.requireBusinessContext(req as BusinessContextRequest, res, next);
};

export const allowEmptyBusinessContext = (req: Request, res: Response, next: NextFunction) => {
  if (!businessContextMiddleware) {
    return next(new Error('Business context middleware not initialized'));
  }
  
  return businessContextMiddleware.allowEmptyBusinessContext(req as BusinessContextRequest, res, next);
};

export const requireSpecificBusinessAccess = (paramName = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!businessContextMiddleware) {
      return next(new Error('Business context middleware not initialized'));
    }
    
    return businessContextMiddleware.requireSpecificBusinessAccess(paramName)(req as BusinessContextRequest, res, next);
  };
};