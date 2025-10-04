// Business Validation Constants - Enterprise Architecture
import { BusinessValidationConfig, BusinessSanitizationConfig } from '../types/businessValidation';
import { BusinessStaffRole } from '@prisma/client';

export const BUSINESS_VALIDATION_CONFIG: BusinessValidationConfig = {
  business: {
    name: {
      minLength: 2,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9ğĞüÜşŞıİöÖçÇ\s\-'&.,()]+$/,
      required: true
    },
    description: {
      maxLength: 1000,
      pattern: /^[a-zA-Z0-9ğĞüÜşŞıİöÖçÇ\s\-'&.,()!?@#$%^&*()_+=\[\]{}|;':",./<>?`~]*$/
    },
    phone: {
      pattern: /^\+?[1-9]\d{1,14}$/
    },
    email: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    address: {
      maxLength: 500,
      pattern: /^[a-zA-Z0-9ğĞüÜşŞıİöÖçÇ\s\-'&.,()!?@#$%^&*()_+=\[\]{}|;':",./<>?`~]*$/
    },
    timezone: {
      pattern: /^[A-Za-z_\/]+$/
    },
    currency: {
      pattern: /^[A-Z]{3}$/
    }
  },
  service: {
    name: {
      minLength: 2,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9ğĞüÜşŞıİöÖçÇ\s\-'&.,()]+$/,
      required: true
    },
    description: {
      maxLength: 500,
      pattern: /^[a-zA-Z0-9ğĞüÜşŞıİöÖçÇ\s\-'&.,()!?@#$%^&*()_+=\[\]{}|;':",./<>?`~]*$/
    },
    duration: {
      min: 15,
      max: 480,
      required: true
    },
    price: {
      min: 0,
      max: 10000,
      required: true
    },
    currency: {
      pattern: /^[A-Z]{3}$/
    },
    bufferTime: {
      min: 0,
      max: 120
    },
    maxAdvanceBooking: {
      min: 1,
      max: 365
    },
    minAdvanceBooking: {
      min: 0,
      max: 72
    }
  },
  staff: {
    userId: {
      pattern: /^[a-zA-Z0-9_-]+$/,
      required: true
    },
    role: {
      required: true
    }
  },
  businessHours: {
    dayOfWeek: {
      min: 0,
      max: 6,
      required: true
    },
    openTime: {
      pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    closeTime: {
      pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    breakStartTime: {
      pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    breakEndTime: {
      pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    }
  }
};

export const BUSINESS_SANITIZATION_CONFIG: BusinessSanitizationConfig = {
  business: {
    name: {
      allowedCharacters: /^[a-zA-Z0-9ğĞüÜşŞıİöÖçÇ\s\-'&.,()]+$/,
      maxLength: 100
    },
    description: {
      allowedTags: ['p', 'br', 'strong', 'em', 'u', 'b', 'i'],
      allowedAttributes: [],
      maxLength: 1000
    },
    phone: {
      allowedCharacters: /^[0-9+\-\s()]+$/
    },
    email: {
      allowedCharacters: /^[a-zA-Z0-9@._-]+$/
    },
    address: {
      allowedCharacters: /^[a-zA-Z0-9ğĞüÜşŞıİöÖçÇ\s\-'&.,()!?@#$%^&*()_+=\[\]{}|;':",./<>?`~]*$/,
      maxLength: 500
    },
    timezone: {
      allowedCharacters: /^[A-Za-z_\/]+$/
    },
    currency: {
      allowedCharacters: /^[A-Z]+$/
    }
  },
  service: {
    name: {
      allowedCharacters: /^[a-zA-Z0-9ğĞüÜşŞıİöÖçÇ\s\-'&.,()]+$/,
      maxLength: 100
    },
    description: {
      allowedTags: ['p', 'br', 'strong', 'em', 'u', 'b', 'i'],
      allowedAttributes: [],
      maxLength: 500
    },
    duration: {
      min: 15,
      max: 480
    },
    price: {
      min: 0,
      max: 10000
    },
    currency: {
      allowedCharacters: /^[A-Z]+$/
    },
    bufferTime: {
      min: 0,
      max: 120
    },
    maxAdvanceBooking: {
      min: 1,
      max: 365
    },
    minAdvanceBooking: {
      min: 0,
      max: 72
    }
  },
  staff: {
    userId: {
      allowedCharacters: /^[a-zA-Z0-9_-]+$/
    },
    role: {
      allowedValues: Object.values(BusinessStaffRole)
    },
    permissions: {
      allowedKeys: /^[a-zA-Z0-9_.-]+$/
    }
  },
  businessHours: {
    dayOfWeek: {
      min: 0,
      max: 6
    },
    openTime: {
      allowedCharacters: /^[0-9:]+$/
    },
    closeTime: {
      allowedCharacters: /^[0-9:]+$/
    },
    breakStartTime: {
      allowedCharacters: /^[0-9:]+$/
    },
    breakEndTime: {
      allowedCharacters: /^[0-9:]+$/
    }
  },
  settings: {
    notificationSettings: {
      allowedKeys: /^[a-zA-Z0-9_.-]+$/
    },
    privacySettings: {
      allowedKeys: /^[a-zA-Z0-9_.-]+$/
    },
    priceSettings: {
      allowedKeys: /^[a-zA-Z0-9_.-]+$/
    },
    staffPrivacySettings: {
      allowedKeys: /^[a-zA-Z0-9_.-]+$/
    }
  }
};

export const BUSINESS_MALICIOUS_PATTERNS: readonly RegExp[] = [
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /<object[^>]*>.*?<\/object>/gi,
  /<embed[^>]*>.*?<\/embed>/gi,
  /<link[^>]*>.*?<\/link>/gi,
  /<meta[^>]*>.*?<\/meta>/gi,
  /<style[^>]*>.*?<\/style>/gi,
  /<form[^>]*>.*?<\/form>/gi,
  /<input[^>]*>.*?<\/input>/gi,
  /<textarea[^>]*>.*?<\/textarea>/gi,
  /<select[^>]*>.*?<\/select>/gi,
  /<option[^>]*>.*?<\/option>/gi,
  /<button[^>]*>.*?<\/button>/gi,
  /<a[^>]*>.*?<\/a>/gi,
  /<img[^>]*>.*?<\/img>/gi,
  /<video[^>]*>.*?<\/video>/gi,
  /<audio[^>]*>.*?<\/audio>/gi,
  /<source[^>]*>.*?<\/source>/gi,
  /<track[^>]*>.*?<\/track>/gi,
  /<map[^>]*>.*?<\/map>/gi,
  /<area[^>]*>.*?<\/area>/gi,
  /<base[^>]*>.*?<\/base>/gi,
  /<col[^>]*>.*?<\/col>/gi,
  /<colgroup[^>]*>.*?<\/colgroup>/gi,
  /<table[^>]*>.*?<\/table>/gi,
  /<thead[^>]*>.*?<\/thead>/gi,
  /<tbody[^>]*>.*?<\/tbody>/gi,
  /<tfoot[^>]*>.*?<\/tfoot>/gi,
  /<tr[^>]*>.*?<\/tr>/gi,
  /<td[^>]*>.*?<\/td>/gi,
  /<th[^>]*>.*?<\/th>/gi,
  /<caption[^>]*>.*?<\/caption>/gi,
  /<fieldset[^>]*>.*?<\/fieldset>/gi,
  /<legend[^>]*>.*?<\/legend>/gi,
  /<label[^>]*>.*?<\/label>/gi,
  /<output[^>]*>.*?<\/output>/gi,
  /<progress[^>]*>.*?<\/progress>/gi,
  /<meter[^>]*>.*?<\/meter>/gi,
  /<details[^>]*>.*?<\/details>/gi,
  /<summary[^>]*>.*?<\/summary>/gi,
  /<dialog[^>]*>.*?<\/dialog>/gi,
  /<menu[^>]*>.*?<\/menu>/gi,
  /<menuitem[^>]*>.*?<\/menuitem>/gi,
  /<command[^>]*>.*?<\/command>/gi,
  /<keygen[^>]*>.*?<\/keygen>/gi,
  /<isindex[^>]*>.*?<\/isindex>/gi,
  /<listing[^>]*>.*?<\/listing>/gi,
  /<plaintext[^>]*>.*?<\/plaintext>/gi,
  /<xmp[^>]*>.*?<\/xmp>/gi,
  /<noembed[^>]*>.*?<\/noembed>/gi,
  /<noframes[^>]*>.*?<\/noframes>/gi,
  /<noscript[^>]*>.*?<\/noscript>/gi,
  /<applet[^>]*>.*?<\/applet>/gi,
  /<blink[^>]*>.*?<\/blink>/gi,
  /<marquee[^>]*>.*?<\/marquee>/gi,
  /<multicol[^>]*>.*?<\/multicol>/gi,
  /<nextid[^>]*>.*?<\/nextid>/gi,
  /<spacer[^>]*>.*?<\/spacer>/gi,
  /<wbr[^>]*>.*?<\/wbr>/gi,
  /<bgsound[^>]*>.*?<\/bgsound>/gi,
  /<ilayer[^>]*>.*?<\/ilayer>/gi,
  /<layer[^>]*>.*?<\/layer>/gi
] as const;

export const BUSINESS_ERROR_MESSAGES = {
  BUSINESS_NAME_REQUIRED: 'Business name is required',
  INVALID_BUSINESS_NAME: 'Invalid business name format',
  BUSINESS_NAME_TOO_LONG: 'Business name is too long',
  DESCRIPTION_TOO_LONG: 'Description is too long',
  INVALID_PHONE: 'Invalid phone number format',
  PHONE_INVALID_FORMAT: 'Phone number format is invalid',
  INVALID_EMAIL: 'Invalid email format',
  EMAIL_INVALID_FORMAT: 'Email format is invalid',
  ADDRESS_TOO_LONG: 'Address is too long',
  INVALID_ADDRESS: 'Invalid address format',
  INVALID_TIMEZONE: 'Invalid timezone format',
  TIMEZONE_INVALID: 'Timezone format is invalid',
  INVALID_CURRENCY: 'Invalid currency format',
  CURRENCY_INVALID: 'Currency must be a 3-letter code',
  SERVICE_NAME_REQUIRED: 'Service name is required',
  INVALID_SERVICE_NAME: 'Invalid service name format',
  SERVICE_NAME_TOO_LONG: 'Service name is too long',
  DURATION_REQUIRED: 'Duration is required',
  INVALID_DURATION: 'Invalid duration',
  DURATION_TOO_SHORT: 'Duration is too short',
  DURATION_TOO_LONG: 'Duration is too long',
  PRICE_REQUIRED: 'Price is required',
  INVALID_PRICE: 'Invalid price',
  PRICE_NEGATIVE: 'Price cannot be negative',
  PRICE_TOO_HIGH: 'Price is too high',
  INVALID_BUFFER_TIME: 'Invalid buffer time',
  BUFFER_TIME_INVALID: 'Buffer time is invalid',
  INVALID_ADVANCE_BOOKING: 'Invalid advance booking',
  ADVANCE_BOOKING_INVALID: 'Advance booking is invalid',
  STAFF_ROLE_REQUIRED: 'Staff role is required',
  INVALID_STAFF_ROLE: 'Invalid staff role',
  STAFF_ROLE_INVALID: 'Staff role is invalid',
  INVALID_PERMISSIONS: 'Invalid permissions',
  PERMISSIONS_INVALID: 'Permissions are invalid',
  INVALID_BUSINESS_HOURS: 'Invalid business hours',
  BUSINESS_HOURS_INVALID: 'Business hours are invalid',
  INVALID_SETTINGS: 'Invalid settings',
  SETTINGS_INVALID: 'Settings are invalid',
  BUSINESS_NAME_MALICIOUS: 'Business name contains potentially malicious content',
  DESCRIPTION_MALICIOUS: 'Description contains potentially malicious content',
  PHONE_MALICIOUS: 'Phone number contains potentially malicious content',
  EMAIL_MALICIOUS: 'Email contains potentially malicious content',
  ADDRESS_MALICIOUS: 'Address contains potentially malicious content',
  SERVICE_NAME_MALICIOUS: 'Service name contains potentially malicious content',
  STAFF_DATA_MALICIOUS: 'Staff data contains potentially malicious content',
  SETTINGS_MALICIOUS: 'Settings contain potentially malicious content'
} as const;

// Business validation limits
export const BUSINESS_VALIDATION_LIMITS = {
  MAX_BUSINESS_NAME_LENGTH: 100,
  MIN_BUSINESS_NAME_LENGTH: 2,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_ADDRESS_LENGTH: 500,
  MAX_SERVICE_NAME_LENGTH: 100,
  MIN_SERVICE_NAME_LENGTH: 2,
  MAX_SERVICE_DESCRIPTION_LENGTH: 500,
  MIN_SERVICE_DURATION: 15,
  MAX_SERVICE_DURATION: 480,
  MIN_SERVICE_PRICE: 0,
  MAX_SERVICE_PRICE: 10000,
  MAX_BUFFER_TIME: 120,
  MIN_ADVANCE_BOOKING: 1,
  MAX_ADVANCE_BOOKING: 365,
  MIN_ADVANCE_BOOKING_MIN: 0,
  MAX_ADVANCE_BOOKING_MIN: 72,
  MAX_BUSINESS_SETTINGS_SIZE: 10,
  MAX_SERVICE_SETTINGS_SIZE: 10,
  MAX_STAFF_PERMISSIONS_SIZE: 20,
  MAX_BUSINESS_HOURS_DAYS: 7
} as const;
