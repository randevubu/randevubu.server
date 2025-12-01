import logger from "../utils/Logger/logger";
/**
 * Migration script for future database translation system
 * Currently using fallback translation service
 */

// Note: This script is for future use when database migration is ready
// For now, translations are handled by the fallback service

logger.info('Translation migration script - Database migration not yet applied');
logger.info('Using fallback translation service for now');

const translations = {
  tr: {
    'notifications.appointmentReminder': "{{businessName}}'da {{serviceName}} hizmetiniz için {{time}} saatinde randevunuz var",
    'notifications.businessClosureNotice': "{{businessName}} {{startDate}} tarihinden itibaren{{#endDate}} {{endDate}} tarihine kadar{{/endDate}} kapanacak. Sebep: {{reason}}",
    'notifications.availabilityAlert': "Harika haber! {{businessName}}'da{{#serviceName}} {{serviceName}} için{{/serviceName}} {{slotCount}} müsait slot var. Hemen rezervasyon yapın.",
    'notifications.rescheduleNotification': "{{businessName}}'da {{serviceName}} hizmetiniz için {{originalTime}} tarihindeki randevunuz iş yeri kapanışı nedeniyle yeniden planlanması gerekiyor. {{suggestionCount}} alternatif saat seçeneğiniz mevcut.",
    'notifications.subscriptionRenewalConfirmation': "{{businessName}} için {{planName}} aboneliğiniz başarıyla yenilendi. Sonraki faturalandırma tarihi: {{nextBillingDate}}.",
    'notifications.subscriptionRenewalReminder': "{{businessName}} için {{planName}} aboneliğinizin süresi {{expiryDate}} tarihinde doluyor. Hizmet kesintisini önlemek için lütfen yenileyin.",
    'notifications.paymentFailureNotification': "{{businessName}} aboneliğiniz için ödeme başarısız. Başarısız deneme sayısı: {{failedPaymentCount}}. Hizmet {{expiryDate}} tarihinde sona eriyor. Lütfen ödeme yönteminizi güncelleyin.",
  },
  en: {
    'notifications.appointmentReminder': "You have an appointment for {{serviceName}} at {{businessName}} at {{time}}",
    'notifications.businessClosureNotice': "{{businessName}} will be closed starting {{startDate}}{{#endDate}} until {{endDate}}{{/endDate}}. Reason: {{reason}}",
    'notifications.availabilityAlert': "Good news! {{businessName}} now has {{slotCount}} available slots{{#serviceName}} for {{serviceName}}{{/serviceName}}. Book now to secure your appointment.",
    'notifications.rescheduleNotification': "Your appointment at {{businessName}} for {{serviceName}} scheduled on {{originalTime}} needs to be rescheduled due to a business closure. We have {{suggestionCount}} alternative time slots available for you.",
    'notifications.subscriptionRenewalConfirmation': "Your subscription to {{planName}} for {{businessName}} has been successfully renewed. Next billing date: {{nextBillingDate}}.",
    'notifications.subscriptionRenewalReminder': "Your subscription to {{planName}} for {{businessName}} expires on {{expiryDate}}. Please renew to avoid service interruption.",
    'notifications.paymentFailureNotification': "Payment failed for your {{businessName}} subscription. Failed attempts: {{failedPaymentCount}}. Service expires on {{expiryDate}}. Please update your payment method.",
  }
};

async function migrateTranslations() {
  logger.info('Translation migration not yet available - using fallback service');
  logger.info('To enable database translations:');
  logger.info('1. Run: npx prisma migrate dev --name add-translations-table');
  logger.info('2. Update this script to use the database');
  logger.info('3. Switch to the full TranslationService');
}

// Run migration if called directly
if (require.main === module) {
  migrateTranslations()
    .then(() => {
      logger.info('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration failed:', error);
      process.exit(1);
    });
}

export { migrateTranslations };
