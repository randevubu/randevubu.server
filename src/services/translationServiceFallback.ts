/**
 * Fallback Translation Service
 * 
 * A simplified version that works without database/Redis for immediate deployment.
 * Can be upgraded to the full version later.
 */

export interface TranslationParams {
  [key: string]: string | number | boolean | Date;
}

export interface TranslationConfig {
  defaultLanguage: string;
  supportedLanguages: string[];
}

export class TranslationService {
  private config: TranslationConfig;
  private translations: Map<string, Map<string, string>> = new Map();

  constructor(config?: Partial<TranslationConfig>) {
    this.config = {
      defaultLanguage: 'tr',
      supportedLanguages: ['tr', 'en'],
      ...config
    };

    // Initialize with hardcoded translations
    this.initializeTranslations();
  }

  /**
   * Initialize translations from hardcoded data
   */
  private initializeTranslations(): void {
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

    // Convert to Map structure
    for (const [language, langTranslations] of Object.entries(translations)) {
      this.translations.set(language, new Map(Object.entries(langTranslations)));
    }
  }

  /**
   * Translate a message with parameters
   */
  async translate(
    key: string,
    params: TranslationParams = {},
    language?: string
  ): Promise<string> {
    const targetLanguage = language || this.config.defaultLanguage;
    
    try {
      // Get translation from memory
      const languageTranslations = this.translations.get(targetLanguage);
      const translation = languageTranslations?.get(key);
      
      if (translation) {
        return this.interpolateParams(translation, params);
      }

      // Try fallback language
      if (targetLanguage !== this.config.defaultLanguage) {
        const fallbackTranslations = this.translations.get(this.config.defaultLanguage);
        const fallbackTranslation = fallbackTranslations?.get(key);
        
        if (fallbackTranslation) {
          return this.interpolateParams(fallbackTranslation, params);
        }
      }

      // Return key as fallback
      console.warn(`Translation not found for key: ${key}, language: ${targetLanguage}`);
      return key;

    } catch (error) {
      console.error(`Translation error for key ${key}:`, error);
      return key;
    }
  }

  /**
   * Interpolate parameters into translation string
   */
  private interpolateParams(template: string, params: TranslationParams): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = params[key];
      
      if (value === undefined || value === null) {
        console.warn(`Missing parameter ${key} for translation template`);
        return match;
      }

      // Handle different data types
      if (value instanceof Date) {
        return this.formatDate(value);
      }
      
      return String(value);
    });
  }

  /**
   * Format date for current locale
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Bulk translate multiple keys
   */
  async translateBulk(
    keys: string[],
    params: TranslationParams = {},
    language?: string
  ): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    
    // Process in parallel for better performance
    const promises = keys.map(async (key) => {
      const translation = await this.translate(key, params, language);
      return { key, translation };
    });

    const translations = await Promise.all(promises);
    
    translations.forEach(({ key, translation }) => {
      results[key] = translation;
    });

    return results;
  }

  /**
   * Clear translation cache (no-op for this implementation)
   */
  async clearCache(pattern?: string): Promise<void> {
    // No-op for fallback implementation
    console.log('Cache clear requested (fallback implementation - no cache)');
  }

  /**
   * Preload translations (no-op for this implementation)
   */
  async preloadTranslations(keys: string[], languages?: string[]): Promise<void> {
    // No-op for fallback implementation
    console.log('Preload requested (fallback implementation - already loaded)');
  }

  /**
   * Validate all translations exist for all languages
   */
  async validateTranslations(): Promise<{
    missing: Array<{ key: string; language: string }>;
    invalid: Array<{ key: string; language: string; error: string }>;
  }> {
    const missing: Array<{ key: string; language: string }> = [];
    const invalid: Array<{ key: string; language: string; error: string }> = [];

    // Get all unique keys
    const allKeys = new Set<string>();
    for (const languageTranslations of this.translations.values()) {
      for (const key of languageTranslations.keys()) {
        allKeys.add(key);
      }
    }

    for (const key of allKeys) {
      for (const language of this.config.supportedLanguages) {
        const languageTranslations = this.translations.get(language);
        const translation = languageTranslations?.get(key);
        
        if (!translation) {
          missing.push({ key, language });
        } else {
          // Validate template syntax
          if (!this.validateTemplate(translation)) {
            invalid.push({ 
              key, 
              language, 
              error: 'Invalid template syntax' 
            });
          }
        }
      }
    }

    return { missing, invalid };
  }

  /**
   * Validate template syntax
   */
  private validateTemplate(template: string): boolean {
    try {
      // Check for balanced braces
      const openBraces = (template.match(/\{\{/g) || []).length;
      const closeBraces = (template.match(/\}\}/g) || []).length;
      
      return openBraces === closeBraces;
    } catch {
      return false;
    }
  }
}
