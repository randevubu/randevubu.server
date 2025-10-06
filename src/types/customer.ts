// Customer Domain Types
export interface CustomerRelationship {
  customerId: string;
  businessId: string;
  relationshipType: 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'OPTED_OUT';
  totalAppointments: number;
  totalSpent: number;
  lastAppointmentDate?: Date;
  firstAppointmentDate?: Date;
  averageRating?: number;
  preferredServices: string[];
  notificationPreferences: {
    sms: boolean;
    email: boolean;
    push: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerValidationResult {
  isValid: boolean;
  relationship?: CustomerRelationship;
  error?: string;
  errorCode?: string;
  reason?: 'NOT_FOUND' | 'BLOCKED' | 'OPTED_OUT' | 'INACTIVE' | 'NO_RELATIONSHIP' | 'ACTIVE_CUSTOMER' | 'PAST_CUSTOMER';
}

export interface BusinessCustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  optedOutCustomers: number;
  blockedCustomers: number;
  last30DaysCustomers: number;
  newCustomersThisMonth: number;
  returningCustomers: number;
  averageSpending: number;
  topSpendingCustomers: Array<{
    customerId: string;
    totalSpent: number;
    appointmentCount: number;
  }>;
  customerRetentionRate: number;
  averageAppointmentsPerCustomer: number;
}


