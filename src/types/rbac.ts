// RBAC Domain Types
export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  conditions?: Record<string, unknown>;
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  level: number;
  permissions: Permission[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPermissions {
  userId: string;
  permissions: Permission[];
  roles: Role[];
  level: 'OWNER' | 'ADMIN' | 'STAFF' | 'CUSTOMER';
  effectiveLevel: number;
  businessId?: string;
  expiresAt?: Date;
}


