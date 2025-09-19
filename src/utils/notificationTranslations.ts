/**
 * Notification Translation Utility
 * 
 * This utility handles translation of notification messages on the backend.
 * It provides Turkish translations for all notification types.
 */

import { ERROR_CODES } from '../constants/errorCodes';

// Turkish translations for notification messages
const TURKISH_TRANSLATIONS = {
  // Appointment reminders
  appointmentReminder: (params: {
    serviceName: string;
    businessName: string;
    time: string;
  }) => `${params.businessName}'da ${params.serviceName} hizmetiniz için ${params.time} saatinde randevunuz var`,

  // Business closure notices
  businessClosureNotice: (params: {
    businessName: string;
    startDate: string;
    endDate?: string;
    reason: string;
  }) => {
    const endDateText = params.endDate ? ` ${params.endDate} tarihine kadar` : '';
    return `${params.businessName} ${params.startDate} tarihinden itibaren${endDateText} kapanacak. Sebep: ${params.reason}`;
  },

  // Availability alerts
  availabilityAlert: (params: {
    businessName: string;
    slotCount: number;
    serviceName?: string;
  }) => {
    const serviceText = params.serviceName ? ` ${params.serviceName} için` : '';
    const slotText = params.slotCount === 1 ? 'slot' : 'slot';
    return `Harika haber! ${params.businessName}'da${serviceText} ${params.slotCount} müsait ${slotText} var. Hemen rezervasyon yapın.`;
  },

  // Reschedule notifications
  rescheduleNotification: (params: {
    businessName: string;
    serviceName: string;
    originalTime: string;
    suggestionCount: number;
  }) => `${params.businessName}'da ${params.serviceName} hizmetiniz için ${params.originalTime} tarihindeki randevunuz iş yeri kapanışı nedeniyle yeniden planlanması gerekiyor. ${params.suggestionCount} alternatif saat seçeneğiniz mevcut.`,

  // Subscription notifications
  subscriptionRenewalConfirmation: (params: {
    businessName: string;
    planName: string;
    nextBillingDate: string;
  }) => `${params.businessName} için ${params.planName} aboneliğiniz başarıyla yenilendi. Sonraki faturalandırma tarihi: ${params.nextBillingDate}.`,

  subscriptionRenewalReminder: (params: {
    businessName: string;
    planName: string;
    expiryDate: string;
  }) => `${params.businessName} için ${params.planName} aboneliğinizin süresi ${params.expiryDate} tarihinde doluyor. Hizmet kesintisini önlemek için lütfen yenileyin.`,

  paymentFailureNotification: (params: {
    businessName: string;
    failedPaymentCount: number;
    expiryDate: string;
  }) => `${params.businessName} aboneliğiniz için ödeme başarısız. Başarısız deneme sayısı: ${params.failedPaymentCount}. Hizmet ${params.expiryDate} tarihinde sona eriyor. Lütfen ödeme yönteminizi güncelleyin.`,
};

// English translations for fallback
const ENGLISH_TRANSLATIONS = {
  appointmentReminder: (params: {
    serviceName: string;
    businessName: string;
    time: string;
  }) => `You have an appointment for ${params.serviceName} at ${params.businessName} at ${params.time}`,

  businessClosureNotice: (params: {
    businessName: string;
    startDate: string;
    endDate?: string;
    reason: string;
  }) => {
    const endDateText = params.endDate ? ` until ${params.endDate}` : '';
    return `${params.businessName} will be closed starting ${params.startDate}${endDateText}. Reason: ${params.reason}`;
  },

  availabilityAlert: (params: {
    businessName: string;
    slotCount: number;
    serviceName?: string;
  }) => {
    const serviceText = params.serviceName ? ` for ${params.serviceName}` : '';
    const slotText = params.slotCount === 1 ? 'slot' : 'slots';
    return `Good news! ${params.businessName} now has ${params.slotCount} available ${slotText}${serviceText}. Book now to secure your appointment.`;
  },

  rescheduleNotification: (params: {
    businessName: string;
    serviceName: string;
    originalTime: string;
    suggestionCount: number;
  }) => `Your appointment at ${params.businessName} for ${params.serviceName} scheduled on ${params.originalTime} needs to be rescheduled due to a business closure. We have ${params.suggestionCount} alternative time slots available for you.`,

  subscriptionRenewalConfirmation: (params: {
    businessName: string;
    planName: string;
    nextBillingDate: string;
  }) => `Your subscription to ${params.planName} for ${params.businessName} has been successfully renewed. Next billing date: ${params.nextBillingDate}.`,

  subscriptionRenewalReminder: (params: {
    businessName: string;
    planName: string;
    expiryDate: string;
  }) => `Your subscription to ${params.planName} for ${params.businessName} expires on ${params.expiryDate}. Please renew to avoid service interruption.`,

  paymentFailureNotification: (params: {
    businessName: string;
    failedPaymentCount: number;
    expiryDate: string;
  }) => `Payment failed for your ${params.businessName} subscription. Failed attempts: ${params.failedPaymentCount}. Service expires on ${params.expiryDate}. Please update your payment method.`,
};

export interface NotificationTranslationParams {
  serviceName?: string;
  businessName: string;
  time?: string;
  startDate?: string;
  endDate?: string;
  reason?: string;
  slotCount?: number;
  planName?: string;
  nextBillingDate?: string;
  expiryDate?: string;
  originalTime?: string;
  suggestionCount?: number;
  failedPaymentCount?: number;
}

/**
 * Translate a notification message based on user's language preference
 */
export function translateNotification(
  messageKey: string,
  params: NotificationTranslationParams,
  language: string = 'tr'
): string {
  const translations = language === 'tr' ? TURKISH_TRANSLATIONS : ENGLISH_TRANSLATIONS;
  
  // Map notification keys to translation functions
  const translationMap: Record<string, (params: any) => string> = {
    'notifications.appointmentReminder': translations.appointmentReminder,
    'notifications.businessClosureNotice': translations.businessClosureNotice,
    'notifications.availabilityAlert': translations.availabilityAlert,
    'notifications.rescheduleNotification': translations.rescheduleNotification,
    'notifications.subscriptionRenewalConfirmation': translations.subscriptionRenewalConfirmation,
    'notifications.subscriptionRenewalReminder': translations.subscriptionRenewalReminder,
    'notifications.paymentFailureNotification': translations.paymentFailureNotification,
  };

  const translationFunction = translationMap[messageKey];
  
  if (!translationFunction) {
    console.warn(`No translation found for message key: ${messageKey}`);
    return messageKey; // Fallback to key if no translation found
  }

  try {
    return translationFunction(params);
  } catch (error) {
    console.error(`Error translating notification ${messageKey}:`, error);
    return messageKey; // Fallback to key if translation fails
  }
}

/**
 * Get notification translation key for a given error code
 */
export function getNotificationTranslationKey(errorCode: string): string {
  const keyMap: Record<string, string> = {
    [ERROR_CODES.APPOINTMENT_REMINDER]: 'notifications.appointmentReminder',
    [ERROR_CODES.BUSINESS_CLOSURE_NOTICE]: 'notifications.businessClosureNotice',
    [ERROR_CODES.AVAILABILITY_ALERT]: 'notifications.availabilityAlert',
    [ERROR_CODES.RESCHEDULE_NOTIFICATION]: 'notifications.rescheduleNotification',
    [ERROR_CODES.SUBSCRIPTION_RENEWAL_CONFIRMATION]: 'notifications.subscriptionRenewalConfirmation',
    [ERROR_CODES.SUBSCRIPTION_RENEWAL_REMINDER]: 'notifications.subscriptionRenewalReminder',
    [ERROR_CODES.PAYMENT_FAILURE_NOTIFICATION]: 'notifications.paymentFailureNotification',
  };

  return keyMap[errorCode] || errorCode;
}

/**
 * Format date for Turkish locale
 */
export function formatDateForLanguage(date: Date, language: string = 'tr'): string {
  if (language === 'tr') {
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
  return date.toLocaleDateString('en-US');
}

/**
 * Format time for Turkish locale
 */
export function formatTimeForLanguage(date: Date, language: string = 'tr'): string {
  if (language === 'tr') {
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format date and time for Turkish locale
 */
export function formatDateTimeForLanguage(date: Date, language: string = 'tr'): string {
  if (language === 'tr') {
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
