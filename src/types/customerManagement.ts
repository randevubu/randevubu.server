/**
 * Customer Management Settings Types
 * Defines types for business customer management settings
 */

export interface CustomerManagementSettings {
  activeCustomerDefinition: {
    monthsThreshold: number; // 1, 3, 6, 12 months
    enabled: boolean;
  };
  loyaltyProgram: {
    appointmentThreshold: number; // 3, 5, 10, 20 appointments
    enabled: boolean;
  };
  customerNotes: {
    allowStaffNotes: boolean;
    allowInternalNotes: boolean;
    maxNoteLength: number;
  };
  appointmentHistory: {
    allowCustomerView: boolean;
    showCancelledAppointments: boolean;
    showNoShowAppointments: boolean;
  };
  birthdayReminders: {
    enabled: boolean;
    reminderDays: number[]; // [1, 3, 7] days before birthday
    messageTemplate: string;
  };
  customerEvaluations: {
    enabled: boolean;
    requiredForCompletion: boolean;
    allowAnonymous: boolean;
    questions: EvaluationQuestion[];
  };
}

export interface EvaluationQuestion {
  id: string;
  question: string;
  type: 'RATING' | 'TEXT' | 'CHOICE';
  required: boolean;
  options?: string[]; // For CHOICE type
  minRating?: number;
  maxRating?: number;
}

export interface CustomerNote {
  id: string;
  customerId: string;
  businessId: string;
  authorId: string;
  noteType: 'STAFF' | 'INTERNAL' | 'CUSTOMER';
  content: string;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
  author?: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export interface CustomerEvaluation {
  id: string;
  customerId: string;
  businessId: string;
  appointmentId: string;
  rating: number;
  comment?: string;
  answers: EvaluationAnswer[];
  isAnonymous: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EvaluationAnswer {
  questionId: string;
  answer: string | number;
  question?: EvaluationQuestion;
}

export interface BirthdayReminder {
  id: string;
  customerId: string;
  businessId: string;
  birthday: Date;
  reminderDate: Date;
  sent: boolean;
  sentAt?: Date;
  message: string;
  createdAt: Date;
}

export interface CustomerLoyaltyStatus {
  customerId: string;
  businessId: string;
  totalAppointments: number;
  isLoyaltyMember: boolean;
  loyaltyTier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  nextTierAppointments: number;
  benefits: string[];
  joinedAt: Date;
}

export const DEFAULT_CUSTOMER_MANAGEMENT_SETTINGS: CustomerManagementSettings = {
  activeCustomerDefinition: {
    monthsThreshold: 3,
    enabled: true
  },
  loyaltyProgram: {
    appointmentThreshold: 5,
    enabled: true
  },
  customerNotes: {
    allowStaffNotes: true,
    allowInternalNotes: true,
    maxNoteLength: 1000
  },
  appointmentHistory: {
    allowCustomerView: true,
    showCancelledAppointments: true,
    showNoShowAppointments: false
  },
  birthdayReminders: {
    enabled: false,
    reminderDays: [1, 3, 7],
    messageTemplate: 'Doğum gününüz kutlu olsun! Size özel indirimli randevu fırsatı için bizimle iletişime geçin.'
  },
  customerEvaluations: {
    enabled: false,
    requiredForCompletion: false,
    allowAnonymous: true,
    questions: [
      {
        id: 'overall_rating',
        question: 'Genel memnuniyetinizi değerlendirin',
        type: 'RATING',
        required: true,
        minRating: 1,
        maxRating: 5
      },
      {
        id: 'service_quality',
        question: 'Hizmet kalitesi nasıldı?',
        type: 'RATING',
        required: true,
        minRating: 1,
        maxRating: 5
      },
      {
        id: 'staff_friendliness',
        question: 'Personel nezaketi nasıldı?',
        type: 'RATING',
        required: true,
        minRating: 1,
        maxRating: 5
      },
      {
        id: 'comments',
        question: 'Ek yorumlarınız',
        type: 'TEXT',
        required: false
      }
    ]
  }
};


