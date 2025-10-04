// Auth Validation Constants - Enterprise Architecture
import { AuthValidationConfig, AuthSanitizationConfig } from '../types/authValidation';
import { VerificationPurpose } from '@prisma/client';

export const AUTH_VALIDATION_CONFIG: AuthValidationConfig = {
  phoneNumber: {
    minLength: 10,
    maxLength: 20,
    pattern: /^\+?[1-9]\d{1,14}$/,
    required: true
  },
  verificationCode: {
    length: 6,
    pattern: /^\d{6}$/,
    required: true
  },
  deviceInfo: {
    deviceId: {
      maxLength: 100,
      pattern: /^[a-zA-Z0-9_-]+$/
    },
    userAgent: {
      maxLength: 500
    },
    ipAddress: {
      pattern: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
    }
  },
  profile: {
    firstName: {
      minLength: 1,
      maxLength: 50,
      pattern: /^[a-zA-ZğĞüÜşŞıİöÖçÇ\s\-']+$/
    },
    lastName: {
      minLength: 1,
      maxLength: 50,
      pattern: /^[a-zA-ZğĞüÜşŞıİöÖçÇ\s\-']+$/
    },
    avatar: {
      maxLength: 500,
      pattern: /^https?:\/\/.+/
    },
    timezone: {
      maxLength: 50,
      pattern: /^[A-Za-z_\/]+$/
    },
    language: {
      length: 2,
      pattern: /^[a-z]{2}$/
    }
  },
  tokens: {
    accessToken: {
      pattern: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/
    },
    refreshToken: {
      pattern: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/
    }
  }
};

export const AUTH_SANITIZATION_CONFIG: AuthSanitizationConfig = {
  phoneNumber: {
    allowedCharacters: /^[0-9+\-\s()]+$/,
    maxLength: 20
  },
  verificationCode: {
    allowedCharacters: /^[0-9]+$/,
    length: 6
  },
  deviceInfo: {
    deviceId: {
      allowedCharacters: /^[a-zA-Z0-9_-]+$/,
      maxLength: 100
    },
    userAgent: {
      maxLength: 500,
      allowedTags: [],
      allowedAttributes: []
    },
    ipAddress: {
      pattern: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
    }
  },
  profile: {
    firstName: {
      allowedCharacters: /^[a-zA-ZğĞüÜşŞıİöÖçÇ\s\-']+$/,
      maxLength: 50
    },
    lastName: {
      allowedCharacters: /^[a-zA-ZğĞüÜşŞıİöÖçÇ\s\-']+$/,
      maxLength: 50
    },
    avatar: {
      maxLength: 500,
      allowedProtocols: ['http:', 'https:']
    },
    timezone: {
      allowedCharacters: /^[A-Za-z_\/]+$/,
      maxLength: 50
    },
    language: {
      allowedCharacters: /^[a-z]+$/,
      length: 2
    }
  },
  tokens: {
    accessToken: {
      allowedCharacters: /^[A-Za-z0-9-_]+$/
    },
    refreshToken: {
      allowedCharacters: /^[A-Za-z0-9-_]+$/
    }
  }
};

export const AUTH_MALICIOUS_PATTERNS: readonly RegExp[] = [
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
  /<layer[^>]*>.*?<\/layer>/gi,
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

export const AUTH_ERROR_MESSAGES = {
  PHONE_NUMBER_REQUIRED: 'Phone number is required',
  INVALID_PHONE_NUMBER: 'Invalid phone number format',
  PHONE_NUMBER_TOO_LONG: 'Phone number is too long',
  VERIFICATION_CODE_REQUIRED: 'Verification code is required',
  INVALID_VERIFICATION_CODE: 'Invalid verification code format',
  VERIFICATION_CODE_INVALID_FORMAT: 'Verification code must be exactly 6 digits',
  PURPOSE_REQUIRED: 'Verification purpose is required',
  INVALID_PURPOSE: 'Invalid verification purpose',
  DEVICE_ID_TOO_LONG: 'Device ID is too long',
  USER_AGENT_TOO_LONG: 'User agent is too long',
  INVALID_IP_ADDRESS: 'Invalid IP address format',
  FIRST_NAME_INVALID: 'First name contains invalid characters',
  LAST_NAME_INVALID: 'Last name contains invalid characters',
  AVATAR_URL_INVALID: 'Avatar must be a valid URL',
  TIMEZONE_INVALID: 'Invalid timezone format',
  LANGUAGE_INVALID: 'Language must be a valid 2-letter ISO code',
  TOKEN_REQUIRED: 'Token is required',
  TOKEN_FORMAT_INVALID: 'Invalid token format',
  DEVICE_INFO_INVALID: 'Invalid device information',
  PROFILE_DATA_INVALID: 'Invalid profile data',
  PHONE_NUMBER_MALICIOUS: 'Phone number contains potentially malicious content',
  VERIFICATION_CODE_MALICIOUS: 'Verification code contains potentially malicious content',
  DEVICE_INFO_MALICIOUS: 'Device information contains potentially malicious content',
  PROFILE_DATA_MALICIOUS: 'Profile data contains potentially malicious content',
  TOKEN_MALICIOUS: 'Token contains potentially malicious content'
} as const;

// Auth validation limits
export const AUTH_VALIDATION_LIMITS = {
  MAX_PHONE_NUMBER_LENGTH: 20,
  MIN_PHONE_NUMBER_LENGTH: 10,
  VERIFICATION_CODE_LENGTH: 6,
  MAX_DEVICE_ID_LENGTH: 100,
  MAX_USER_AGENT_LENGTH: 500,
  MAX_FIRST_NAME_LENGTH: 50,
  MAX_LAST_NAME_LENGTH: 50,
  MAX_AVATAR_URL_LENGTH: 500,
  MAX_TIMEZONE_LENGTH: 50,
  LANGUAGE_CODE_LENGTH: 2,
  MAX_PROFILE_UPDATE_FIELDS: 5,
  MAX_DEVICE_INFO_FIELDS: 3,
  MAX_TOKEN_LENGTH: 1000
} as const;
