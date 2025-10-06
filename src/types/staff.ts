// Staff Domain Types
import { BusinessStaffRole } from '@prisma/client';

export interface InviteStaffRequest {
  businessId: string;
  phoneNumber: string;
  role: BusinessStaffRole;
  permissions?: any;
  firstName?: string;
  lastName?: string;
}

export interface VerifyStaffInvitationRequest {
  businessId: string;
  phoneNumber: string;
  verificationCode: string;
  role: BusinessStaffRole;
  permissions?: any;
  firstName?: string;
  lastName?: string;
}
