import { Request, Response, NextFunction } from 'express';
import { AuthMiddleware } from './auth';
import { AuthorizationMiddleware } from './authorization';
import { RepositoryContainer } from '../repositories';
import { ServiceContainer } from '../services';
import { PermissionName, RoleName } from '../types/auth';
import prisma from '../lib/prisma';

// Initialize global middleware instances
const repositories = new RepositoryContainer(prisma);
const services = new ServiceContainer(repositories);
const authMiddleware = new AuthMiddleware(repositories, services.tokenService, services.rbacService);
const authorizationMiddleware = new AuthorizationMiddleware(services.rbacService);

// Export simplified middleware functions
export const authenticateToken = authMiddleware.authenticate;

export const requirePermission = (permission: PermissionName) => {
  return authorizationMiddleware.requirePermission({ 
    resource: 'general', 
    action: permission 
  });
};

export const requireRole = (role: RoleName) => {
  return authorizationMiddleware.requireRole({ roles: [role] });
};

export const requireAny = (permissions: PermissionName[]) => {
  const middlewares = permissions.map(p => requirePermission(p));
  return authorizationMiddleware.requireAny(...middlewares);
};