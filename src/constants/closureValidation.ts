// Closure Validation Constants - Enterprise Architecture
import { ClosureValidationConfig, ClosureSanitizationConfig } from '../types/closureValidation';
import { ClosureType } from '@prisma/client';

export const CLOSURE_VALIDATION_CONFIG: ClosureValidationConfig = {
  closure: {
    startDate: {
      pattern: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/,
      required: true
    },
    endDate: {
      pattern: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/
    },
    reason: {
      minLength: 5,
      maxLength: 200,
      pattern: /^[a-zA-Z0-9ğĞüÜşŞıİöÖçÇ\s\-'&.,()!?@#$%^&*()_+=\[\]{}|;':",./<>?`~]*$/,
      required: true
    },
    type: {
      required: true
    },
    affectedServices: {
      maxLength: 50,
      itemPattern: /^[a-zA-Z0-9_-]+$/
    },
    recurringPattern: {
      maxKeys: 10,
      allowedKeys: /^[a-zA-Z0-9_.-]+$/
    },
    notificationMessage: {
      maxLength: 500,
      pattern: /^[a-zA-Z0-9ğĞüÜşŞıİöÖçÇ\s\-'&.,()!?@#$%^&*()_+=\[\]{}|;':",./<>?`~]*$/
    },
    notificationChannels: {
      maxLength: 10,
      allowedValues: ['EMAIL', 'SMS', 'PUSH', 'WHATSAPP']
    }
  },
  analytics: {
    businessId: {
      pattern: /^[a-zA-Z0-9_-]+$/,
      required: true
    },
    startDate: {
      pattern: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/
    },
    endDate: {
      pattern: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/
    },
    type: {
      required: false
    }
  },
  reschedule: {
    closureId: {
      pattern: /^[a-zA-Z0-9_-]+$/,
      required: true
    },
    businessId: {
      pattern: /^[a-zA-Z0-9_-]+$/,
      required: true
    },
    maxRescheduleDays: {
      min: 1,
      max: 30
    },
    preferredTimeSlots: {
      allowedValues: ['MORNING', 'AFTERNOON', 'EVENING', 'ANY']
    }
  }
};

export const CLOSURE_SANITIZATION_CONFIG: ClosureSanitizationConfig = {
  closure: {
    startDate: {
      allowedCharacters: /^[0-9TZ:.-]+$/
    },
    endDate: {
      allowedCharacters: /^[0-9TZ:.-]+$/
    },
    reason: {
      allowedCharacters: /^[a-zA-Z0-9ğĞüÜşŞıİöÖçÇ\s\-'&.,()!?@#$%^&*()_+=\[\]{}|;':",./<>?`~]*$/,
      maxLength: 200
    },
    affectedServices: {
      allowedCharacters: /^[a-zA-Z0-9_-]+$/,
      maxLength: 50
    },
    recurringPattern: {
      allowedKeys: /^[a-zA-Z0-9_.-]+$/,
      maxKeys: 10
    },
    notificationMessage: {
      allowedTags: ['p', 'br', 'strong', 'em', 'u', 'b', 'i'],
      allowedAttributes: [],
      maxLength: 500
    },
    notificationChannels: {
      allowedValues: ['EMAIL', 'SMS', 'PUSH', 'WHATSAPP'],
      maxLength: 10
    }
  },
  analytics: {
    businessId: {
      allowedCharacters: /^[a-zA-Z0-9_-]+$/
    },
    startDate: {
      allowedCharacters: /^[0-9TZ:.-]+$/
    },
    endDate: {
      allowedCharacters: /^[0-9TZ:.-]+$/
    }
  },
  reschedule: {
    closureId: {
      allowedCharacters: /^[a-zA-Z0-9_-]+$/
    },
    businessId: {
      allowedCharacters: /^[a-zA-Z0-9_-]+$/
    },
    maxRescheduleDays: {
      min: 1,
      max: 30
    },
    preferredTimeSlots: {
      allowedValues: ['MORNING', 'AFTERNOON', 'EVENING', 'ANY']
    }
  }
};

export const CLOSURE_MALICIOUS_PATTERNS: readonly RegExp[] = [
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

export const CLOSURE_ERROR_MESSAGES = {
  START_DATE_REQUIRED: 'Start date is required',
  INVALID_START_DATE: 'Invalid start date format',
  START_DATE_PAST: 'Start date cannot be in the past',
  INVALID_END_DATE: 'Invalid end date format',
  END_DATE_BEFORE_START: 'End date must be at or after start date',
  REASON_REQUIRED: 'Reason is required',
  INVALID_REASON: 'Invalid reason format',
  REASON_TOO_SHORT: 'Reason is too short',
  REASON_TOO_LONG: 'Reason is too long',
  TYPE_REQUIRED: 'Closure type is required',
  INVALID_TYPE: 'Invalid closure type',
  INVALID_AFFECTED_SERVICES: 'Invalid affected services',
  INVALID_SERVICE_ID: 'Invalid service ID format',
  INVALID_RECURRING_PATTERN: 'Invalid recurring pattern',
  INVALID_RECURRING_PATTERN_FORMAT: 'Invalid recurring pattern format',
  INVALID_NOTIFICATION_MESSAGE: 'Invalid notification message',
  NOTIFICATION_MESSAGE_TOO_LONG: 'Notification message is too long',
  INVALID_NOTIFICATION_CHANNELS: 'Invalid notification channels',
  INVALID_NOTIFICATION_CHANNEL: 'Invalid notification channel',
  BUSINESS_ID_REQUIRED: 'Business ID is required',
  INVALID_BUSINESS_ID: 'Invalid business ID format',
  CLOSURE_ID_REQUIRED: 'Closure ID is required',
  INVALID_CLOSURE_ID: 'Invalid closure ID format',
  INVALID_DATE_FORMAT: 'Invalid date format',
  START_DATE_MALICIOUS: 'Start date contains potentially malicious content',
  END_DATE_MALICIOUS: 'End date contains potentially malicious content',
  REASON_MALICIOUS: 'Reason contains potentially malicious content',
  NOTIFICATION_MESSAGE_MALICIOUS: 'Notification message contains potentially malicious content',
  RECURRING_PATTERN_MALICIOUS: 'Recurring pattern contains potentially malicious content'
} as const;

// Closure validation limits
export const CLOSURE_VALIDATION_LIMITS = {
  MAX_REASON_LENGTH: 200,
  MIN_REASON_LENGTH: 5,
  MAX_AFFECTED_SERVICES: 50,
  MAX_RECURRING_PATTERN_KEYS: 10,
  MAX_NOTIFICATION_MESSAGE_LENGTH: 500,
  MAX_NOTIFICATION_CHANNELS: 10,
  MAX_RESCHEDULE_DAYS: 30,
  MIN_RESCHEDULE_DAYS: 1,
  MAX_CLOSURE_DURATION_DAYS: 365,
  MIN_CLOSURE_DURATION_MINUTES: 15,
  MAX_CLOSURE_DURATION_DAYS_SINGLE: 30,
  MAX_RECURRING_PATTERN_SIZE: 10,
  MAX_NOTIFICATION_CHANNELS_SIZE: 10
} as const;
