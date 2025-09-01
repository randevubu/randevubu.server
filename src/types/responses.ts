// Lean response types for APIs - only include what's needed

export interface AppointmentListItem {
  id: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  duration: number;
  status: string;
  price: number;
  currency: string;
  customerNotes?: string;
  internalNotes?: string;
  // Minimal service info
  service: {
    id: string;
    name: string;
    duration: number;
  };
  // Minimal staff info
  staff?: {
    firstName: string;
    lastName: string;
  };
  // Minimal customer info (for business view)
  customer?: {
    firstName: string;
    lastName: string;
    phoneNumber?: string;
  };
}

export interface AppointmentDetails extends AppointmentListItem {
  // Extended details only when specifically requested
  businessId: string;
  serviceId: string;
  staffId?: string;
  customerId: string;
  bookedAt: Date;
  confirmedAt?: Date;
  completedAt?: Date;
  canceledAt?: Date;
  cancelReason?: string;
  reminderSent: boolean;
  reminderSentAt?: Date;
}

export interface BusinessListItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  email: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  isActive: boolean;
  isVerified: boolean;
  isClosed: boolean;
  primaryColor?: string;
  tags: string[];
}

export interface ServiceListItem {
  id: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  currency: string;
  category?: string;
  isActive: boolean;
  business: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface BusinessStats {
  totalAppointments: number;
  activeServices: number;
  totalStaff: number;
  isSubscribed: boolean;
}

export interface AppointmentStats {
  total: number;
  byStatus: Record<string, number>;
  totalRevenue: number;
  averageValue: number;
}