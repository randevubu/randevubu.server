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
        // Notifications
        'notifications.appointmentReminder': "{{businessName}}'da {{serviceName}} hizmetiniz için {{time}} saatinde randevunuz var",
        'notifications.businessClosureNotice': "{{businessName}} {{startDate}} tarihinden itibaren{{#endDate}} {{endDate}} tarihine kadar{{/endDate}} kapanacak. Sebep: {{reason}}",
        'notifications.availabilityAlert': "Harika haber! {{businessName}}'da{{#serviceName}} {{serviceName}} için{{/serviceName}} {{slotCount}} müsait slot var. Hemen rezervasyon yapın.",
        'notifications.rescheduleNotification': "{{businessName}}'da {{serviceName}} hizmetiniz için {{originalTime}} tarihindeki randevunuz iş yeri kapanışı nedeniyle yeniden planlanması gerekiyor. {{suggestionCount}} alternatif saat seçeneğiniz mevcut.",
        'notifications.subscriptionRenewalConfirmation': "{{businessName}} için {{planName}} aboneliğiniz başarıyla yenilendi. Sonraki faturalandırma tarihi: {{nextBillingDate}}.",
        'notifications.subscriptionRenewalReminder': "{{businessName}} için {{planName}} aboneliğinizin süresi {{expiryDate}} tarihinde doluyor. Hizmet kesintisini önlemek için lütfen yenileyin.",
        'notifications.paymentFailureNotification': "{{businessName}} aboneliğiniz için ödeme başarısız. Başarısız deneme sayısı: {{failedPaymentCount}}. Hizmet {{expiryDate}} tarihinde sona eriyor. Lütfen ödeme yönteminizi güncelleyin.",
        
        // Success Messages
        'success.general.created': '{{resource}} başarıyla oluşturuldu',
        'success.general.updated': '{{resource}} başarıyla güncellendi',
        'success.general.deleted': '{{resource}} başarıyla silindi',
        'success.general.retrieved': '{{resource}} başarıyla getirildi',
        'success.general.saved': '{{resource}} başarıyla kaydedildi',
        'success.discountCode.created': 'İndirim kodu başarıyla oluşturuldu',
        'success.discountCode.applied': 'İndirim kodu başarıyla uygulandı',
        'success.discountCode.retrieved': 'İndirim kodu başarıyla getirildi',
        'success.discountCode.retrievedList': 'İndirim kodları başarıyla getirildi',
        'success.discountCode.updated': 'İndirim kodu başarıyla güncellendi',
        'success.discountCode.deleted': 'İndirim kodu başarıyla silindi',
        'success.discountCode.activated': 'İndirim kodu başarıyla etkinleştirildi',
        'success.discountCode.deactivated': 'İndirim kodu başarıyla devre dışı bırakıldı',
        'success.discountCode.usageRetrieved': 'İndirim kodu kullanım bilgileri başarıyla getirildi',
        'success.discountCode.statsRetrieved': 'İndirim kodu istatistikleri başarıyla getirildi',
        'success.discountCode.validated': 'İndirim kodu doğrulaması tamamlandı',
        'success.discountCode.generated': '{{count}} indirim kodu başarıyla oluşturuldu',
        'success.appointment.created': 'Randevu başarıyla oluşturuldu',
        'success.appointment.updated': 'Randevu başarıyla güncellendi',
        'success.appointment.cancelled': 'Randevu başarıyla iptal edildi',
        'success.appointment.confirmed': 'Randevu başarıyla onaylandı',
        'success.appointment.batchUpdated': '{{count}} randevu başarıyla güncellendi',
        'success.appointment.batchCancelled': '{{count}} randevu başarıyla iptal edildi',
        'success.appointment.retrieved': 'Randevu başarıyla getirildi',
        'success.appointment.retrievedList': 'Randevular başarıyla getirildi',
        'success.appointment.completed': 'Randevu başarıyla tamamlandı',
        'success.appointment.markedNoShow': 'Randevu gelmedi olarak işaretlendi',
        'success.appointment.statusUpdated': 'Randevu durumu başarıyla güncellendi',
        'success.appointment.customerRetrieved': 'Müşteri randevuları başarıyla getirildi',
        'success.appointment.staffRetrieved': 'Personel randevuları başarıyla getirildi',
        'success.appointment.searchCompleted': 'Randevu araması başarıyla tamamlandı',
        'success.appointment.upcomingRetrieved': 'Yaklaşan randevular başarıyla getirildi',
        'success.appointment.statsRetrieved': 'Randevu istatistikleri başarıyla getirildi',
        'success.appointment.allRetrieved': 'Tüm randevular başarıyla getirildi',
        'success.appointment.byDateRange': 'Tarih aralığına göre randevular başarıyla getirildi',
        'success.appointment.byStatus': 'Duruma göre randevular başarıyla getirildi',
        'success.appointment.byService': 'Hizmete göre randevular başarıyla getirildi',
        'success.appointment.byStaff': 'Personele göre randevular başarıyla getirildi',
        'success.appointment.businessRetrieved': 'İş yeri randevuları başarıyla getirildi',
        'success.appointment.currentHourNone': 'Şu an için randevu bulunamadı',
        'success.appointment.currentHourNearest': 'Şu an için en yakın randevu başarıyla getirildi',
        'success.appointment.currentHourRetrieved': 'Şu an için randevular başarıyla getirildi',
        'success.contact.sent': 'Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.',
        'success.business.created': 'İş yeri başarıyla oluşturuldu',
        'success.business.updated': 'İş yeri başarıyla güncellendi',
        'success.business.servicesRetrieved': 'Hizmetler başarıyla getirildi',
        'success.business.noServicesFound': 'Hizmet bulunamadı - önce bir iş yeri oluşturun',
        'success.business.nearbyRetrieved': 'Yakındaki iş yerleri başarıyla getirildi',
        'success.business.statsRetrieved': 'İş yeri istatistikleri başarıyla getirildi',
        'success.business.slugChecked': 'URL uygunluğu başarıyla kontrol edildi',
        'success.business.staffRetrieved': 'Personel başarıyla getirildi',
        'success.business.staffAdded': 'Personel başarıyla eklendi',
        'success.business.staffVerified': 'Personel başarıyla doğrulandı',
        'success.business.imageUploaded': '{{imageType}} görseli başarıyla yüklendi',
        'success.business.imageDeleted': '{{imageType}} görseli başarıyla silindi',
        'success.business.galleryImageDeleted': 'Galeri görseli başarıyla silindi',
        'success.business.imagesRetrieved': 'İş yeri görselleri başarıyla getirildi',
        'success.business.galleryUpdated': 'Galeri görselleri başarıyla güncellendi',
        'success.business.googleIntegrationUpdated': 'Google entegrasyonu başarıyla güncellendi',
        'success.business.googleIntegrationRetrieved': 'Google entegrasyon ayarları başarıyla getirildi',
        'success.service.created': 'Hizmet başarıyla oluşturuldu',
        'success.service.updated': 'Hizmet başarıyla güncellendi',
        'success.service.deleted': 'Hizmet başarıyla silindi',
        'success.service.retrieved': 'Hizmet başarıyla getirildi',
        'success.service.businessRetrieved': 'İş yeri hizmetleri başarıyla getirildi',
        'success.service.publicRetrieved': 'Halka açık iş yeri hizmetleri başarıyla getirildi',
        'success.service.reordered': 'Hizmetler başarıyla yeniden sıralandı',
        'success.service.statsRetrieved': 'Hizmet istatistikleri başarıyla getirildi',
        'success.service.pricesUpdated': 'Fiyatlar {{multiplier}} çarpanı ile başarıyla güncellendi',
        'success.service.popularRetrieved': 'Popüler hizmetler başarıyla getirildi',
        'success.service.availabilityChecked': 'Hizmet müsaitliği başarıyla kontrol edildi',
        'success.service.activated': 'Hizmet başarıyla etkinleştirildi',
        'success.service.deactivated': 'Hizmet başarıyla devre dışı bırakıldı',
        'success.service.duplicated': 'Hizmet başarıyla çoğaltıldı',
        'success.service.batchActivated': '{{count}} hizmet başarıyla etkinleştirildi',
        'success.service.batchDeactivated': '{{count}} hizmet başarıyla devre dışı bırakıldı',
        'success.service.batchDeleted': '{{count}} hizmet başarıyla silindi',
        'success.staff.created': 'Personel başarıyla oluşturuldu',
        'success.staff.updated': 'Personel başarıyla güncellendi',
        'success.staff.deleted': 'Personel başarıyla silindi',
        'success.staff.invited': 'Personel davetiyesi gönderildi',
        'success.staff.verified': 'Personel başarıyla doğrulandı',
        'success.staff.retrieved': 'Personel başarıyla getirildi',
        'success.staff.retrievedSingle': 'Personel üyesi başarıyla getirildi',
        'success.staff.removed': 'Personel başarıyla kaldırıldı',
        'success.staff.statsRetrieved': 'Personel istatistikleri başarıyla getirildi',
        'success.staff.byRoleRetrieved': 'Rol bazında personel başarıyla getirildi',
        'success.staff.positionsRetrieved': 'Personel pozisyonları başarıyla getirildi',
        'success.staff.transferred': 'Personel başarıyla transfer edildi',
        'success.staff.bulkInvited': 'Toplu davetiye tamamlandı',
        'success.staff.rolesRetrieved': 'Müsait personel rolleri başarıyla getirildi',
        'success.staff.publicRetrieved': 'Halka açık iş yeri personeli başarıyla getirildi',
        'success.role.created': 'Rol başarıyla oluşturuldu',
        'success.role.retrieved': 'Rol başarıyla getirildi',
        'success.role.retrievedList': 'Roller başarıyla getirildi',
        'success.role.updated': 'Rol başarıyla güncellendi',
        'success.role.deleted': 'Rol başarıyla silindi',
        'success.role.permissionCreated': 'İzin başarıyla oluşturuldu',
        'success.role.permissionsAssigned': 'İzinler role başarıyla atandı',
        'success.role.assignedToUser': 'Rol kullanıcıya başarıyla atandı',
        'success.rating.submitted': 'Değerlendirme başarıyla gönderildi',
        'success.rating.retrieved': 'Değerlendirmeler başarıyla getirildi',
        'success.rating.eligibilityChecked': 'Değerlendirme uygunluğu kontrol edildi',
        'success.rating.notFound': 'Değerlendirme bulunamadı',
        'success.rating.retrievedSingle': 'Değerlendirme başarıyla getirildi',
        'success.rating.cacheRefreshed': 'Değerlendirme önbelleği başarıyla yenilendi',
        'success.payment.subscriptionCreated': 'Abonelik ödemesi başarıyla oluşturuldu',
        'success.payment.refunded': 'Ödeme başarıyla iade edildi',
        'success.payment.cancelled': 'Ödeme başarıyla iptal edildi',
        'success.payment.retrieved': 'Ödeme başarıyla getirildi',
        'success.payment.historyRetrieved': 'Ödeme geçmişi başarıyla getirildi',
        'success.payment.testCardsRetrieved': 'Iyzico test ortamı için test kartları',
        'success.payment.subscriptionPlansRetrieved': 'Abonelik planları başarıyla getirildi',
        'success.payment.webhookProcessed': 'Webhook başarıyla işlendi',
        'success.paymentMethod.updated': 'Ödeme yöntemi başarıyla güncellendi',
        'success.paymentMethod.retrieved': 'Ödeme yöntemi başarıyla getirildi',
        'success.paymentMethod.retryInitiated': 'Ödeme yeniden denemesi başlatıldı. Sistem otomatik olarak ödemeyi işleyecektir.',
        'success.dailyNotebook.retrieved': 'Günlük defter başarıyla getirildi',
        'success.dailyNotebook.entriesUpdated': 'Günlük girişler başarıyla güncellendi',
        'success.dailyNotebook.entryUpdated': 'Giriş başarıyla güncellendi',
        'success.dailyNotebook.revenueColumnsRetrieved': 'Gelir sütunları başarıyla getirildi',
        'success.dailyNotebook.revenueColumnCreated': 'Gelir sütunu başarıyla oluşturuldu',
        'success.dailyNotebook.revenueColumnUpdated': 'Gelir sütunu başarıyla güncellendi',
        'success.dailyNotebook.revenueColumnDeleted': 'Gelir sütunu başarıyla silindi',
        'success.dailyNotebook.appointmentRevenueRetrieved': 'Randevu geliri başarıyla getirildi',
        'success.dailyNotebook.financialSummaryRetrieved': 'Finansal özet başarıyla getirildi',
        'success.report.businessOverviewRetrieved': 'İş yeri genel bakış raporu başarıyla getirildi',
        'success.report.revenueRetrieved': 'Gelir raporu başarıyla getirildi',
        'success.report.appointmentRetrieved': 'Randevu raporu başarıyla getirildi',
        'success.report.customerRetrieved': 'Müşteri raporu başarıyla getirildi',
        'success.report.exported': '{{reportType}} raporu başarıyla dışa aktarıldı',
        'success.report.customGenerated': 'Özel rapor başarıyla oluşturuldu',
        'success.report.scheduled': 'Rapor başarıyla planlandı',
        'success.notification.sent': 'Bildirim başarıyla gönderildi',
        'success.notification.sendingFailed': 'Bildirim gönderimi başarısız oldu',
        'success.notification.broadcastFailed': 'Yayın gönderimi başarısız oldu',
        'success.notification.closureFailed': 'Kapanış bildirimi başarısız oldu',
        'success.notification.testFailed': 'Test bildirimi başarısız oldu',
        'success.notification.markedRead': 'Bildirim başarıyla okundu olarak işaretlendi',
        'success.notification.markedUnread': 'Bildirim başarıyla okunmadı olarak işaretlendi',
        'success.notification.statsRetrieved': 'Bildirim istatistikleri başarıyla getirildi',
        'success.notification.securityAlertsRetrieved': 'Güvenlik uyarıları başarıyla getirildi',
        'success.notification.deleted': 'Bildirim başarıyla silindi',
        'success.notification.systemHealthRetrieved': 'Sistem sağlığı başarıyla getirildi',
        'success.userBehavior.retrieved': 'Kullanıcı davranışı başarıyla getirildi',
        'success.userBehavior.summaryRetrieved': 'Kullanıcı özeti başarıyla getirildi',
        'success.userBehavior.bothRetrieved': 'Kullanıcı davranışı ve özeti başarıyla getirildi',
        'success.userBehavior.statusRetrieved': 'Kullanıcı durumu başarıyla getirildi',
        'success.userBehavior.strikeAdded': 'Uyarı başarıyla eklendi',
        'success.userBehavior.strikeRemoved': 'Uyarı başarıyla kaldırıldı',
        'success.userBehavior.statusUpdated': 'Kullanıcı durumu başarıyla güncellendi',
        'success.userBehavior.unbanned': 'Kullanıcı yasağı başarıyla kaldırıldı',
        'success.userBehavior.problematicRetrieved': 'Sorunlu kullanıcılar başarıyla getirildi',
        'success.userBehavior.riskAssessmentRetrieved': 'Kullanıcı risk değerlendirmesi başarıyla getirildi',
        'success.userBehavior.reliabilityScoreCalculated': 'Kullanıcı güvenilirlik skoru başarıyla hesaplandı',
        'success.userBehavior.customerBehaviorRetrieved': 'İş yeri için müşteri davranışı başarıyla getirildi',
        'success.userBehavior.flaggedForReview': 'Kullanıcı inceleme için işaretlendi',
        'success.userBehavior.statsRetrieved': 'Kullanıcı davranış istatistikleri başarıyla getirildi',
        'success.userBehavior.processed': '{{processed}} kullanıcı işlendi, {{banned}} yeni yasak',
        'success.userBehavior.strikesReset': '{{count}} kullanıcı için uyarılar sıfırlandı',
        'success.userBehavior.unbannedExpired': '{{count}} kullanıcının süresi dolmuş yasağı kaldırıldı',
        'success.userBehavior.strikesAdded': '{{successCount}}/{{total}} kullanıcıya uyarı eklendi',
        'success.userBehavior.banned': '{{successCount}}/{{total}} kullanıcı {{durationDays}} gün süreyle yasaklandı',
        'success.pushNotification.subscribed': 'Push bildirimlerine başarıyla abone olundu',
        'success.pushNotification.unsubscribed': 'Push bildirimlerinden başarıyla abonelik iptal edildi',
        'success.pushNotification.subscriptionsRetrieved': 'Push abonelikleri başarıyla getirildi',
        'success.pushNotification.preferencesUpdated': 'Bildirim tercihleri başarıyla güncellendi',
        'success.pushNotification.defaultPreferencesRetrieved': 'Varsayılan bildirim tercihleri getirildi',
        'success.pushNotification.preferencesRetrieved': 'Bildirim tercihleri başarıyla getirildi',
        'success.pushNotification.sent': 'Push bildirimi gönderildi. {{successful}} başarılı, {{failed}} başarısız.',
        'success.pushNotification.testSent': 'Test bildirimi gönderildi. {{successful}} başarılı, {{failed}} başarısız.',
        'success.pushNotification.batchSent': '{{count}} kullanıcıya toplu bildirim gönderildi. {{successful}} başarılı, {{failed}} başarısız.',
        'success.pushNotification.historyRetrieved': 'Bildirim geçmişi başarıyla getirildi',
        'success.pushNotification.vapidKeyRetrieved': 'VAPID genel anahtarı başarıyla getirildi',
        'success.pushNotification.healthCheckCompleted': 'Push bildirim servisi sağlık kontrolü tamamlandı',
        'success.businessType.retrieved': 'İş yeri türleri başarıyla getirildi',
        'success.businessType.allRetrieved': 'Tüm iş yeri türleri başarıyla getirildi',
        'success.businessType.byCategoryRetrieved': '{{category}} kategorisi için iş yeri türleri başarıyla getirildi',
        'success.businessType.retrievedSingle': 'İş yeri türü başarıyla getirildi',
        'success.businessType.withCountRetrieved': 'Sayı ile iş yeri türleri başarıyla getirildi',
        'success.businessType.categoriesRetrieved': 'Kategoriler başarıyla getirildi',
        'success.businessType.groupedRetrieved': 'Kategoriye göre gruplanmış iş yeri türleri başarıyla getirildi',
        'success.usage.summaryRetrieved': 'Kullanım özeti başarıyla getirildi',
        'success.usage.alertsRetrieved': 'Kullanım uyarıları başarıyla getirildi',
        'success.usage.dailySmsRetrieved': 'Son {{days}} günlük SMS kullanımı başarıyla getirildi',
        'success.usage.monthlyHistoryRetrieved': 'Son {{months}} aylık kullanım geçmişi başarıyla getirildi',
        'success.usage.limitsChecked': 'Kullanım limitleri kontrolü başarıyla tamamlandı',
        'success.usage.dataRefreshed': 'Kullanım verileri başarıyla yenilendi',
        'success.customer.created': 'Müşteri başarıyla oluşturuldu',
        'success.customer.updated': 'Müşteri başarıyla güncellendi',
        'success.customer.deleted': 'Müşteri başarıyla silindi',
        'success.subscription.created': 'Abonelik başarıyla oluşturuldu',
        'success.subscription.updated': 'Abonelik başarıyla güncellendi',
        'success.subscription.cancelled': 'Abonelik başarıyla iptal edildi',
        'success.subscription.plansRetrieved': 'Abonelik planları başarıyla getirildi',
        'success.subscription.planRetrieved': 'Abonelik planı başarıyla getirildi',
        'success.subscription.retrieved': 'Abonelik başarıyla getirildi',
        'success.subscription.activated': 'Abonelik başarıyla etkinleştirildi',
        'success.subscription.deactivated': 'Abonelik başarıyla devre dışı bırakıldı',
        'success.subscription.renewed': 'Abonelik başarıyla yenilendi',
        'success.subscription.paymentProcessed': 'Ödeme başarıyla işlendi',
        'success.subscription.paymentMethodUpdated': 'Ödeme yöntemi başarıyla güncellendi',
        'success.subscription.paymentHistoryRetrieved': 'Ödeme geçmişi başarıyla getirildi',
        'success.subscription.invoiceGenerated': 'Fatura başarıyla oluşturuldu',
        'success.subscription.invoicesRetrieved': 'Faturalar başarıyla getirildi',
        'success.subscription.invoiceRetrieved': 'Fatura başarıyla getirildi',
        'success.subscription.trialExtended': 'Deneme süresi başarıyla uzatıldı',
        'success.subscription.upgraded': 'Abonelik başarıyla yükseltildi',
        'success.subscription.downgraded': 'Abonelik başarıyla düşürüldü',
        'success.subscription.featuresRetrieved': 'Abonelik özellikleri başarıyla getirildi',
        'success.subscription.usageRetrieved': 'Kullanım bilgileri başarıyla getirildi',
        'success.subscription.statsRetrieved': 'Abonelik istatistikleri başarıyla getirildi',
        'success.subscription.businessRetrieved': 'İş yeri aboneliği başarıyla getirildi',
        'success.subscription.historyRetrieved': 'Abonelik geçmişi başarıyla getirildi',
        'success.subscription.planUpgraded': 'Plan başarıyla yükseltildi',
        'success.subscription.planDowngraded': 'Plan başarıyla düşürüldü',
        'success.subscription.reactivated': 'Abonelik başarıyla yeniden etkinleştirildi',
        'success.subscription.trialConverted': 'Deneme aboneliği aktif aboneliğe dönüştürüldü',
        'success.subscription.limitsRetrieved': 'Abonelik limitleri başarıyla getirildi',
        'success.subscription.prorationCalculated': 'Yükseltme oranlaması başarıyla hesaplandı',
        'success.subscription.limitsValidated': 'Plan limitleri doğrulaması başarıyla tamamlandı',
        'success.subscription.allRetrieved': 'Tüm abonelikler başarıyla getirildi',
        'success.subscription.trialsEndingRetrieved': 'Yakında biten denemeler başarıyla getirildi',
        'success.subscription.expiredRetrieved': 'Süresi dolmuş abonelikler başarıyla getirildi',
        'success.subscription.statusUpdated': 'Abonelik durumu başarıyla güncellendi',
        'success.subscription.expiredProcessed': '{{count}} süresi dolmuş abonelik işlendi',
        'success.subscription.renewalsProcessed': '{{processed}} yenileme işlendi, {{renewed}} başarılı, {{failed}} başarısız',
        'success.subscription.trialNotificationsSent': '{{count}} deneme bitiş bildirimi gönderildi',
        'success.subscription.changeCalculated': 'Abonelik değişiklik hesaplaması başarıyla tamamlandı',
        'success.subscription.planChanged': 'Abonelik planı başarıyla değiştirildi',
        'success.subscription.cancelledAtPeriodEnd': 'Abonelik dönem sonunda iptal edilecek',
        'success.subscription.cancelledImmediately': 'Abonelik hemen iptal edildi',
        'success.auth.login': 'Giriş başarılı',
        'success.auth.logout': 'Çıkış başarılı',
        'success.auth.registered': 'Kayıt başarılı',
        'success.auth.verified': 'Hesap başarıyla doğrulandı',
        'success.auth.passwordReset': 'Şifre sıfırlama bağlantısı gönderildi',
        'success.auth.passwordChanged': 'Şifre başarıyla değiştirildi',
        'success.auth.verificationCodeSent': 'Doğrulama kodu gönderildi',
        'success.auth.tokenRefreshed': 'Token başarıyla yenilendi',
        'success.auth.profileRetrieved': 'Profil başarıyla getirildi',
        'success.auth.profileUpdated': 'Profil başarıyla güncellendi',
        'success.auth.phoneChanged': 'Telefon numarası başarıyla değiştirildi. Lütfen yeni numara ile giriş yapın.',
        'success.auth.accountDeactivated': 'Hesap başarıyla devre dışı bırakıldı',
        'success.auth.customersRetrieved': 'Müşteriler başarıyla getirildi',
        'success.auth.customerDetailsRetrieved': 'Müşteri detayları başarıyla getirildi',
        'success.auth.statsRetrieved': 'İstatistikler başarıyla getirildi',
        
        // Authentication & Authorization Errors
        'errors.auth.unauthorized': 'Yetkilendirme gerekli',
        'errors.auth.invalidToken': 'Geçersiz token',
        'errors.auth.tokenExpired': 'Token süresi dolmuş',
        'errors.auth.accessDenied': 'Erişim reddedildi',
        'errors.auth.invalidCredentials': 'Geçersiz kimlik bilgileri',
        'errors.auth.invalidPhoneNumber': 'Geçersiz telefon numarası',
        'errors.auth.invalidVerificationCode': 'Geçersiz doğrulama kodu',
        'errors.auth.verificationCodeExpired': 'Doğrulama kodu süresi dolmuş',
        'errors.auth.phoneAlreadyRegistered': 'Bu telefon numarası zaten kayıtlı',
        'errors.auth.phoneNotRegistered': 'Bu telefon numarası kayıtlı değil',
        'errors.auth.accountDisabled': 'Hesap devre dışı bırakılmış',
        'errors.auth.accountNotVerified': 'Hesap doğrulanmamış',
        'errors.auth.tooManyLoginAttempts': 'Çok fazla giriş denemesi. Lütfen {{retryAfter}} saniye sonra tekrar deneyin',
        'errors.auth.sessionExpired': 'Oturum süresi dolmuş',
        
        // Business Errors
        'errors.business.accessDenied': 'İş yerine erişim reddedildi',
        'errors.business.notFound': 'İş yeri bulunamadı',
        'errors.business.inactive': 'İş yeri aktif değil',
        'errors.business.closed': 'İş yeri kapalı',
        'errors.business.notVerified': 'İş yeri doğrulanmamış',
        'errors.business.slugTaken': 'Bu URL zaten kullanılıyor',
        'errors.business.ownerRequired': 'İş yeri sahibi gerekli',
        'errors.business.staffRequired': 'Personel gerekli',
        'errors.business.noAccess': 'Bu iş yerine erişim izniniz yok',
        'errors.business.subscriptionRequired': 'Abonelik gerekli',
        'errors.business.limitReached': 'İş yeri limitine ulaşıldı',
        'errors.business.deletionNotAllowed': 'İş yeri silinmesine izin verilmiyor',
        'errors.business.smsQuotaExceeded': 'SMS kotası aşıldı',
        'errors.business.staffLimitExceeded': 'Personel limiti aşıldı',
        'errors.business.serviceLimitExceeded': 'Hizmet limiti aşıldı',
        'errors.business.customerLimitExceeded': 'Müşteri limiti aşıldı',
        
        // Appointment Errors
        'errors.appointment.notFound': 'Randevu bulunamadı',
        'errors.appointment.accessDenied': 'Randevuya erişim reddedildi',
        'errors.appointment.timeConflict': 'Randevu zamanı çakışıyor',
        'errors.appointment.pastDate': 'Geçmiş tarih seçilemez',
        'errors.appointment.tooFarFuture': 'Çok ileri bir tarih seçildi',
        'errors.appointment.outsideHours': 'İş yeri çalışma saatleri dışında',
        'errors.appointment.alreadyConfirmed': 'Randevu zaten onaylanmış',
        'errors.appointment.alreadyCompleted': 'Randevu zaten tamamlanmış',
        'errors.appointment.alreadyCancelled': 'Randevu zaten iptal edilmiş',
        'errors.appointment.cannotCancel': 'Randevu iptal edilemez',
        'errors.appointment.noShowNotAllowed': 'Gelmedi olarak işaretlenemez',
        'errors.appointment.staffNotAvailable': 'Personel müsait değil',
        'errors.appointment.serviceUnavailable': 'Hizmet müsait değil',
        
        // Service Errors
        'errors.service.notFound': 'Hizmet bulunamadı',
        'errors.service.inactive': 'Hizmet aktif değil',
        'errors.service.accessDenied': 'Hizmete erişim reddedildi',
        'errors.service.nameRequired': 'Hizmet adı gerekli',
        'errors.service.priceInvalid': 'Geçersiz fiyat',
        'errors.service.durationInvalid': 'Geçersiz süre',
        'errors.service.hasAppointments': 'Hizmetin randevuları var, silinemez',
        
        // Customer Errors
        'errors.customer.notFound': 'Müşteri bulunamadı',
        'errors.customer.accessDenied': 'Müşteriye erişim reddedildi',
        'errors.customer.alreadyExists': 'Müşteri zaten mevcut',
        'errors.customer.noCustomersFound': 'Müşteri bulunamadı',
        
        // Staff Errors
        'errors.staff.notFound': 'Personel bulunamadı',
        'errors.staff.accessDenied': 'Personele erişim reddedildi',
        'errors.staff.alreadyExists': 'Personel zaten mevcut',
        'errors.staff.notAvailable': 'Personel müsait değil',
        'errors.staff.cannotDeleteSelf': 'Kendinizi silemezsiniz',
        
        // Role & Permission Errors
        'errors.role.notFound': 'Rol bulunamadı',
        'errors.role.alreadyExists': 'Rol zaten mevcut',
        'errors.role.assignmentFailed': 'Rol ataması başarısız',
        'errors.permission.denied': 'İzin reddedildi',
        'errors.permission.notFound': 'İzin bulunamadı',
        'errors.permission.insufficient': 'Yetersiz izin',
        'errors.permission.adminRequired': 'Yönetici rolü gerekli',
        
        // Validation Errors
        'errors.validation.general': 'Geçersiz veri gönderildi',
        'errors.validation.requiredField': '{{field}} alanı zorunludur',
        'errors.validation.invalidEmail': 'Geçersiz e-posta formatı',
        'errors.validation.invalidPhone': 'Geçersiz telefon formatı',
        'errors.validation.invalidDate': 'Geçersiz tarih formatı',
        'errors.validation.invalidTime': 'Geçersiz saat formatı',
        'errors.validation.passwordTooWeak': 'Şifre çok zayıf',
        'errors.validation.invalidFileType': 'Geçersiz dosya tipi',
        'errors.validation.fileTooLarge': 'Dosya boyutu çok büyük',
        'errors.validation.invalidUrl': 'Geçersiz URL formatı',
        
        // System Errors
        'errors.system.internalError': 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin',
        'errors.system.databaseError': 'Veritabanı hatası oluştu',
        'errors.system.externalServiceError': 'Harici servis hatası',
        'errors.system.rateLimitExceeded': 'İstek limiti aşıldı. Lütfen {{retryAfter}} saniye sonra tekrar deneyin',
        'errors.system.maintenanceMode': 'Sistem bakımda',
        'errors.system.serviceUnavailable': 'Servis kullanılamıyor',
        'errors.system.paymentProcessingError': 'Ödeme işleme hatası',
        
        // Subscription Errors
        'errors.subscription.notFound': 'Abonelik bulunamadı',
        'errors.subscription.expired': 'Abonelik süresi dolmuş',
        'errors.subscription.cancelled': 'Abonelik iptal edilmiş',
        'errors.subscription.required': 'Abonelik gerekli',
        'errors.subscription.planLimitReached': 'Plan limitine ulaşıldı',
        
        // Notification Errors
        'errors.notification.smsDeliveryFailed': 'SMS gönderimi başarısız',
        'errors.notification.emailDeliveryFailed': 'E-posta gönderimi başarısız',
        'errors.notification.disabled': 'Bildirim devre dışı',
      },
      en: {
        // Notifications
        'notifications.appointmentReminder': "You have an appointment for {{serviceName}} at {{businessName}} at {{time}}",
        'notifications.businessClosureNotice': "{{businessName}} will be closed starting {{startDate}}{{#endDate}} until {{endDate}}{{/endDate}}. Reason: {{reason}}",
        'notifications.availabilityAlert': "Good news! {{businessName}} now has {{slotCount}} available slots{{#serviceName}} for {{serviceName}}{{/serviceName}}. Book now to secure your appointment.",
        'notifications.rescheduleNotification': "Your appointment at {{businessName}} for {{serviceName}} scheduled on {{originalTime}} needs to be rescheduled due to a business closure. We have {{suggestionCount}} alternative time slots available for you.",
        'notifications.subscriptionRenewalConfirmation': "Your subscription to {{planName}} for {{businessName}} has been successfully renewed. Next billing date: {{nextBillingDate}}.",
        'notifications.subscriptionRenewalReminder': "Your subscription to {{planName}} for {{businessName}} expires on {{expiryDate}}. Please renew to avoid service interruption.",
        'notifications.paymentFailureNotification': "Payment failed for your {{businessName}} subscription. Failed attempts: {{failedPaymentCount}}. Service expires on {{expiryDate}}. Please update your payment method.",
        
        // Success Messages
        'success.general.created': '{{resource}} created successfully',
        'success.general.updated': '{{resource}} updated successfully',
        'success.general.deleted': '{{resource}} deleted successfully',
        'success.general.retrieved': '{{resource}} retrieved successfully',
        'success.general.saved': '{{resource}} saved successfully',
        'success.discountCode.created': 'Discount code created successfully',
        'success.discountCode.applied': 'Discount code applied successfully',
        'success.discountCode.retrieved': 'Discount code retrieved successfully',
        'success.discountCode.retrievedList': 'Discount codes retrieved successfully',
        'success.discountCode.updated': 'Discount code updated successfully',
        'success.discountCode.deleted': 'Discount code deleted successfully',
        'success.discountCode.activated': 'Discount code activated successfully',
        'success.discountCode.deactivated': 'Discount code deactivated successfully',
        'success.discountCode.usageRetrieved': 'Discount code usage information retrieved successfully',
        'success.discountCode.statsRetrieved': 'Discount code statistics retrieved successfully',
        'success.discountCode.validated': 'Discount code validation completed',
        'success.discountCode.generated': 'Successfully generated {{count}} discount codes',
        'success.appointment.created': 'Appointment created successfully',
        'success.appointment.updated': 'Appointment updated successfully',
        'success.appointment.cancelled': 'Appointment cancelled successfully',
        'success.appointment.confirmed': 'Appointment confirmed successfully',
        'success.appointment.batchUpdated': '{{count}} appointments updated successfully',
        'success.appointment.batchCancelled': '{{count}} appointments cancelled successfully',
        'success.appointment.retrieved': 'Appointment retrieved successfully',
        'success.appointment.retrievedList': 'Appointments retrieved successfully',
        'success.appointment.completed': 'Appointment completed successfully',
        'success.appointment.markedNoShow': 'Appointment marked as no-show',
        'success.appointment.statusUpdated': 'Appointment status updated successfully',
        'success.appointment.customerRetrieved': 'Customer appointments retrieved successfully',
        'success.appointment.staffRetrieved': 'Staff appointments retrieved successfully',
        'success.appointment.searchCompleted': 'Appointments search completed successfully',
        'success.appointment.upcomingRetrieved': 'Upcoming appointments retrieved successfully',
        'success.appointment.statsRetrieved': 'Appointment stats retrieved successfully',
        'success.appointment.allRetrieved': 'All appointments retrieved successfully',
        'success.appointment.byDateRange': 'Appointments by date range retrieved successfully',
        'success.appointment.byStatus': 'Appointments by status retrieved successfully',
        'success.appointment.byService': 'Appointments by service retrieved successfully',
        'success.appointment.byStaff': 'Appointments by staff retrieved successfully',
        'success.appointment.businessRetrieved': 'Business appointments retrieved successfully',
        'success.appointment.currentHourNone': 'No appointments found in the current hour',
        'success.appointment.currentHourNearest': 'Nearest appointment in current hour retrieved successfully',
        'success.appointment.currentHourRetrieved': 'Current hour appointments retrieved successfully',
        'success.appointment.todaysRetrieved': 'Today\'s appointments retrieved successfully',
        'success.appointment.monitorRetrieved': 'Monitor appointments retrieved successfully',
        'success.appointment.availableSlotsRetrieved': 'Available time slots retrieved successfully',
        'success.contact.sent': 'Your message has been sent successfully. We will get back to you as soon as possible.',
        'success.business.created': 'Business created successfully',
        'success.business.updated': 'Business updated successfully',
        'success.business.servicesRetrieved': 'Services retrieved successfully',
        'success.business.noServicesFound': 'No services found - create a business first',
        'success.business.nearbyRetrieved': 'Nearby businesses retrieved successfully',
        'success.business.statsRetrieved': 'Business stats retrieved successfully',
        'success.business.slugChecked': 'Slug availability checked successfully',
        'success.business.staffRetrieved': 'Staff retrieved successfully',
        'success.business.staffAdded': 'Staff member added successfully',
        'success.business.staffVerified': 'Staff member verified successfully',
        'success.business.imageUploaded': '{{imageType}} image uploaded successfully',
        'success.business.imageDeleted': '{{imageType}} image deleted successfully',
        'success.business.galleryImageDeleted': 'Gallery image deleted successfully',
        'success.business.imagesRetrieved': 'Business images retrieved successfully',
        'success.business.galleryUpdated': 'Gallery images updated successfully',
        'success.business.googleIntegrationUpdated': 'Google integration updated successfully',
        'success.business.googleIntegrationRetrieved': 'Google integration settings retrieved successfully',
        'success.service.created': 'Service created successfully',
        'success.service.updated': 'Service updated successfully',
        'success.service.deleted': 'Service deleted successfully',
        'success.service.retrieved': 'Service retrieved successfully',
        'success.service.businessRetrieved': 'Business services retrieved successfully',
        'success.service.publicRetrieved': 'Public business services retrieved successfully',
        'success.service.reordered': 'Services reordered successfully',
        'success.service.statsRetrieved': 'Service statistics retrieved successfully',
        'success.service.pricesUpdated': 'Prices updated with multiplier {{multiplier}}',
        'success.service.popularRetrieved': 'Popular services retrieved successfully',
        'success.service.availabilityChecked': 'Service availability checked successfully',
        'success.service.activated': 'Service activated successfully',
        'success.service.deactivated': 'Service deactivated successfully',
        'success.service.duplicated': 'Service duplicated successfully',
        'success.service.batchActivated': '{{count}} services activated successfully',
        'success.service.batchDeactivated': '{{count}} services deactivated successfully',
        'success.service.batchDeleted': '{{count}} services deleted successfully',
        'success.staff.created': 'Staff member created successfully',
        'success.staff.updated': 'Staff member updated successfully',
        'success.staff.deleted': 'Staff member deleted successfully',
        'success.staff.invited': 'Staff invitation sent',
        'success.staff.verified': 'Staff member verified successfully',
        'success.staff.retrieved': 'Staff retrieved successfully',
        'success.staff.retrievedSingle': 'Staff member retrieved successfully',
        'success.staff.removed': 'Staff member removed successfully',
        'success.staff.statsRetrieved': 'Staff statistics retrieved successfully',
        'success.staff.byRoleRetrieved': 'Staff by role retrieved successfully',
        'success.staff.positionsRetrieved': 'Staff positions retrieved successfully',
        'success.staff.transferred': 'Staff transferred successfully',
        'success.staff.bulkInvited': 'Bulk invitation completed',
        'success.staff.rolesRetrieved': 'Available staff roles retrieved successfully',
        'success.staff.publicRetrieved': 'Public business staff retrieved successfully',
        'success.role.created': 'Role created successfully',
        'success.role.retrieved': 'Role retrieved successfully',
        'success.role.retrievedList': 'Roles retrieved successfully',
        'success.role.updated': 'Role updated successfully',
        'success.role.deleted': 'Role deleted successfully',
        'success.role.permissionCreated': 'Permission created successfully',
        'success.role.permissionsAssigned': 'Permissions assigned to role successfully',
        'success.role.assignedToUser': 'Role assigned to user successfully',
        'success.rating.submitted': 'Rating submitted successfully',
        'success.rating.retrieved': 'Ratings retrieved successfully',
        'success.rating.eligibilityChecked': 'Rating eligibility checked',
        'success.rating.notFound': 'No rating found',
        'success.rating.retrievedSingle': 'Rating retrieved successfully',
        'success.rating.cacheRefreshed': 'Rating cache refreshed successfully',
        'success.payment.subscriptionCreated': 'Subscription payment created successfully',
        'success.payment.refunded': 'Payment refunded successfully',
        'success.payment.cancelled': 'Payment cancelled successfully',
        'success.payment.retrieved': 'Payment retrieved successfully',
        'success.payment.historyRetrieved': 'Payment history retrieved successfully',
        'success.payment.testCardsRetrieved': 'Test cards for Iyzico sandbox environment',
        'success.payment.subscriptionPlansRetrieved': 'Subscription plans retrieved successfully',
        'success.payment.webhookProcessed': 'Webhook processed successfully',
        'success.paymentMethod.updated': 'Payment method updated successfully',
        'success.paymentMethod.retrieved': 'Payment method retrieved successfully',
        'success.paymentMethod.retryInitiated': 'Payment retry initiated. The system will process the payment automatically.',
        'success.dailyNotebook.retrieved': 'Daily notebook retrieved successfully',
        'success.dailyNotebook.entriesUpdated': 'Daily entries updated successfully',
        'success.dailyNotebook.entryUpdated': 'Entry updated successfully',
        'success.dailyNotebook.revenueColumnsRetrieved': 'Revenue columns retrieved successfully',
        'success.dailyNotebook.revenueColumnCreated': 'Revenue column created successfully',
        'success.dailyNotebook.revenueColumnUpdated': 'Revenue column updated successfully',
        'success.dailyNotebook.revenueColumnDeleted': 'Revenue column deleted successfully',
        'success.dailyNotebook.appointmentRevenueRetrieved': 'Appointment revenue retrieved successfully',
        'success.dailyNotebook.financialSummaryRetrieved': 'Financial summary retrieved successfully',
        'success.report.businessOverviewRetrieved': 'Business overview report retrieved successfully',
        'success.report.revenueRetrieved': 'Revenue report retrieved successfully',
        'success.report.appointmentRetrieved': 'Appointment report retrieved successfully',
        'success.report.customerRetrieved': 'Customer report retrieved successfully',
        'success.report.exported': '{{reportType}} report exported successfully',
        'success.report.customGenerated': 'Custom report generated successfully',
        'success.report.scheduled': 'Report scheduled successfully',
        'success.notification.sent': 'Notification sent successfully',
        'success.notification.sendingFailed': 'Notification sending failed',
        'success.notification.broadcastFailed': 'Broadcast sending failed',
        'success.notification.closureFailed': 'Closure notification failed',
        'success.notification.testFailed': 'Test notification failed',
        'success.notification.markedRead': 'Notification marked as read successfully',
        'success.notification.markedUnread': 'Notification marked as unread successfully',
        'success.notification.statsRetrieved': 'Notification statistics retrieved successfully',
        'success.notification.securityAlertsRetrieved': 'Security alerts retrieved successfully',
        'success.notification.deleted': 'Notification deleted successfully',
        'success.notification.systemHealthRetrieved': 'System health retrieved successfully',
        'success.userBehavior.retrieved': 'User behavior retrieved successfully',
        'success.userBehavior.summaryRetrieved': 'User summary retrieved successfully',
        'success.userBehavior.bothRetrieved': 'User behavior and summary retrieved successfully',
        'success.userBehavior.statusRetrieved': 'User status retrieved successfully',
        'success.userBehavior.strikeAdded': 'Strike added successfully',
        'success.userBehavior.strikeRemoved': 'Strike removed successfully',
        'success.userBehavior.statusUpdated': 'User status updated successfully',
        'success.userBehavior.unbanned': 'User unbanned successfully',
        'success.userBehavior.problematicRetrieved': 'Problematic users retrieved successfully',
        'success.userBehavior.riskAssessmentRetrieved': 'User risk assessment retrieved successfully',
        'success.userBehavior.reliabilityScoreCalculated': 'User reliability score calculated successfully',
        'success.userBehavior.customerBehaviorRetrieved': 'Customer behavior for business retrieved successfully',
        'success.userBehavior.flaggedForReview': 'User flagged for review successfully',
        'success.userBehavior.statsRetrieved': 'User behavior stats retrieved successfully',
        'success.userBehavior.processed': 'Processed {{processed}} users, {{banned}} new bans',
        'success.userBehavior.strikesReset': 'Reset strikes for {{count}} users',
        'success.userBehavior.unbannedExpired': 'Unbanned {{count}} users with expired bans',
        'success.userBehavior.strikesAdded': 'Added strikes to {{successCount}}/{{total}} users',
        'success.userBehavior.banned': 'Banned {{successCount}}/{{total}} users for {{durationDays}} days',
        'success.pushNotification.subscribed': 'Successfully subscribed to push notifications',
        'success.pushNotification.unsubscribed': 'Successfully unsubscribed from push notifications',
        'success.pushNotification.subscriptionsRetrieved': 'Push subscriptions retrieved successfully',
        'success.pushNotification.preferencesUpdated': 'Notification preferences updated successfully',
        'success.pushNotification.defaultPreferencesRetrieved': 'Default notification preferences retrieved',
        'success.pushNotification.preferencesRetrieved': 'Notification preferences retrieved successfully',
        'success.pushNotification.sent': 'Push notification sent. {{successful}} successful, {{failed}} failed.',
        'success.pushNotification.testSent': 'Test notification sent. {{successful}} successful, {{failed}} failed.',
        'success.pushNotification.batchSent': 'Batch notification sent to {{count}} users. {{successful}} successful, {{failed}} failed.',
        'success.pushNotification.historyRetrieved': 'Notification history retrieved successfully',
        'success.pushNotification.vapidKeyRetrieved': 'VAPID public key retrieved successfully',
        'success.pushNotification.healthCheckCompleted': 'Push notification service health check completed',
        'success.businessType.retrieved': 'Business types retrieved successfully',
        'success.businessType.allRetrieved': 'All business types retrieved successfully',
        'success.businessType.byCategoryRetrieved': 'Business types for category \'{{category}}\' retrieved successfully',
        'success.businessType.retrievedSingle': 'Business type retrieved successfully',
        'success.businessType.withCountRetrieved': 'Business types with count retrieved successfully',
        'success.businessType.categoriesRetrieved': 'Categories retrieved successfully',
        'success.businessType.groupedRetrieved': 'Business types grouped by category retrieved successfully',
        'success.usage.summaryRetrieved': 'Usage summary retrieved successfully',
        'success.usage.alertsRetrieved': 'Usage alerts retrieved successfully',
        'success.usage.dailySmsRetrieved': 'Daily SMS usage for last {{days}} days retrieved successfully',
        'success.usage.monthlyHistoryRetrieved': 'Monthly usage history for last {{months}} months retrieved successfully',
        'success.usage.limitsChecked': 'Usage limits check completed successfully',
        'success.usage.dataRefreshed': 'Usage data refreshed successfully',
        'success.customer.created': 'Customer created successfully',
        'success.customer.updated': 'Customer updated successfully',
        'success.customer.deleted': 'Customer deleted successfully',
        'success.subscription.created': 'Subscription created successfully',
        'success.subscription.updated': 'Subscription updated successfully',
        'success.subscription.cancelled': 'Subscription cancelled successfully',
        'success.subscription.plansRetrieved': 'Subscription plans retrieved successfully',
        'success.subscription.planRetrieved': 'Subscription plan retrieved successfully',
        'success.subscription.retrieved': 'Subscription retrieved successfully',
        'success.subscription.activated': 'Subscription activated successfully',
        'success.subscription.deactivated': 'Subscription deactivated successfully',
        'success.subscription.renewed': 'Subscription renewed successfully',
        'success.subscription.paymentProcessed': 'Payment processed successfully',
        'success.subscription.paymentMethodUpdated': 'Payment method updated successfully',
        'success.subscription.paymentHistoryRetrieved': 'Payment history retrieved successfully',
        'success.subscription.invoiceGenerated': 'Invoice generated successfully',
        'success.subscription.invoicesRetrieved': 'Invoices retrieved successfully',
        'success.subscription.invoiceRetrieved': 'Invoice retrieved successfully',
        'success.subscription.trialExtended': 'Trial period extended successfully',
        'success.subscription.upgraded': 'Subscription upgraded successfully',
        'success.subscription.downgraded': 'Subscription downgraded successfully',
        'success.subscription.featuresRetrieved': 'Subscription features retrieved successfully',
        'success.subscription.usageRetrieved': 'Usage information retrieved successfully',
        'success.subscription.statsRetrieved': 'Subscription statistics retrieved successfully',
        'success.subscription.businessRetrieved': 'Business subscription retrieved successfully',
        'success.subscription.historyRetrieved': 'Subscription history retrieved successfully',
        'success.subscription.planUpgraded': 'Plan upgraded successfully',
        'success.subscription.planDowngraded': 'Plan downgraded successfully',
        'success.subscription.reactivated': 'Subscription reactivated successfully',
        'success.subscription.trialConverted': 'Trial converted to active subscription',
        'success.subscription.limitsRetrieved': 'Subscription limits retrieved successfully',
        'success.subscription.prorationCalculated': 'Upgrade proration calculated successfully',
        'success.subscription.limitsValidated': 'Plan limits validation completed successfully',
        'success.subscription.allRetrieved': 'All subscriptions retrieved successfully',
        'success.subscription.trialsEndingRetrieved': 'Trials ending soon retrieved successfully',
        'success.subscription.expiredRetrieved': 'Expired subscriptions retrieved successfully',
        'success.subscription.statusUpdated': 'Subscription status updated successfully',
        'success.subscription.expiredProcessed': 'Processed {{count}} expired subscriptions',
        'success.subscription.renewalsProcessed': 'Processed {{processed}} renewals, {{renewed}} successful, {{failed}} failed',
        'success.subscription.trialNotificationsSent': 'Sent {{count}} trial ending notifications',
        'success.subscription.changeCalculated': 'Subscription change calculation completed successfully',
        'success.subscription.planChanged': 'Subscription plan changed successfully',
        'success.subscription.cancelledAtPeriodEnd': 'Subscription will be cancelled at period end',
        'success.subscription.cancelledImmediately': 'Subscription cancelled immediately',
        'success.auth.login': 'Login successful',
        'success.auth.logout': 'Logout successful',
        'success.auth.registered': 'Registration successful',
        'success.auth.verified': 'Account verified successfully',
        'success.auth.passwordReset': 'Password reset link sent',
        'success.auth.passwordChanged': 'Password changed successfully',
        'success.auth.verificationCodeSent': 'Verification code sent',
        'success.auth.tokenRefreshed': 'Token refreshed successfully',
        'success.auth.profileRetrieved': 'Profile retrieved successfully',
        'success.auth.profileUpdated': 'Profile updated successfully',
        'success.auth.phoneChanged': 'Phone number changed successfully. Please login again with new number.',
        'success.auth.accountDeactivated': 'Account deactivated successfully',
        'success.auth.customersRetrieved': 'Customers retrieved successfully',
        'success.auth.customerDetailsRetrieved': 'Customer details retrieved successfully',
        'success.auth.statsRetrieved': 'Stats retrieved successfully',
        
        // Authentication & Authorization Errors
        'errors.auth.unauthorized': 'Authorization required',
        'errors.auth.invalidToken': 'Invalid token',
        'errors.auth.tokenExpired': 'Token has expired',
        'errors.auth.accessDenied': 'Access denied',
        'errors.auth.invalidCredentials': 'Invalid credentials',
        'errors.auth.invalidPhoneNumber': 'Invalid phone number',
        'errors.auth.invalidVerificationCode': 'Invalid verification code',
        'errors.auth.verificationCodeExpired': 'Verification code has expired',
        'errors.auth.phoneAlreadyRegistered': 'This phone number is already registered',
        'errors.auth.phoneNotRegistered': 'This phone number is not registered',
        'errors.auth.accountDisabled': 'Account is disabled',
        'errors.auth.accountNotVerified': 'Account is not verified',
        'errors.auth.tooManyLoginAttempts': 'Too many login attempts. Please try again after {{retryAfter}} seconds',
        'errors.auth.sessionExpired': 'Session has expired',
        
        // Business Errors
        'errors.business.accessDenied': 'Business access denied',
        'errors.business.notFound': 'Business not found',
        'errors.business.inactive': 'Business is inactive',
        'errors.business.closed': 'Business is closed',
        'errors.business.notVerified': 'Business is not verified',
        'errors.business.slugTaken': 'This URL is already taken',
        'errors.business.ownerRequired': 'Business owner required',
        'errors.business.staffRequired': 'Staff required',
        'errors.business.noAccess': 'You do not have access to this business',
        'errors.business.subscriptionRequired': 'Subscription required',
        'errors.business.limitReached': 'Business limit reached',
        'errors.business.deletionNotAllowed': 'Business deletion not allowed',
        'errors.business.smsQuotaExceeded': 'SMS quota exceeded',
        'errors.business.staffLimitExceeded': 'Staff limit exceeded',
        'errors.business.serviceLimitExceeded': 'Service limit exceeded',
        'errors.business.customerLimitExceeded': 'Customer limit exceeded',
        
        // Appointment Errors
        'errors.appointment.notFound': 'Appointment not found',
        'errors.appointment.accessDenied': 'Appointment access denied',
        'errors.appointment.timeConflict': 'Appointment time conflict',
        'errors.appointment.pastDate': 'Past date cannot be selected',
        'errors.appointment.tooFarFuture': 'Date is too far in the future',
        'errors.appointment.outsideHours': 'Outside business hours',
        'errors.appointment.alreadyConfirmed': 'Appointment already confirmed',
        'errors.appointment.alreadyCompleted': 'Appointment already completed',
        'errors.appointment.alreadyCancelled': 'Appointment already cancelled',
        'errors.appointment.cannotCancel': 'Appointment cannot be cancelled',
        'errors.appointment.noShowNotAllowed': 'Cannot mark as no-show',
        'errors.appointment.staffNotAvailable': 'Staff not available',
        'errors.appointment.serviceUnavailable': 'Service unavailable',
        
        // Service Errors
        'errors.service.notFound': 'Service not found',
        'errors.service.inactive': 'Service is inactive',
        'errors.service.accessDenied': 'Service access denied',
        'errors.service.nameRequired': 'Service name required',
        'errors.service.priceInvalid': 'Invalid price',
        'errors.service.durationInvalid': 'Invalid duration',
        'errors.service.hasAppointments': 'Service has appointments and cannot be deleted',
        
        // Customer Errors
        'errors.customer.notFound': 'Customer not found',
        'errors.customer.accessDenied': 'Customer access denied',
        'errors.customer.alreadyExists': 'Customer already exists',
        'errors.customer.noCustomersFound': 'No customers found',
        
        // Staff Errors
        'errors.staff.notFound': 'Staff not found',
        'errors.staff.accessDenied': 'Staff access denied',
        'errors.staff.alreadyExists': 'Staff already exists',
        'errors.staff.notAvailable': 'Staff not available',
        'errors.staff.cannotDeleteSelf': 'You cannot delete yourself',
        
        // Role & Permission Errors
        'errors.role.notFound': 'Role not found',
        'errors.role.alreadyExists': 'Role already exists',
        'errors.role.assignmentFailed': 'Role assignment failed',
        'errors.permission.denied': 'Permission denied',
        'errors.permission.notFound': 'Permission not found',
        'errors.permission.insufficient': 'Insufficient permissions',
        'errors.permission.adminRequired': 'Admin role required',
        
        // Validation Errors
        'errors.validation.general': 'Invalid data provided',
        'errors.validation.requiredField': '{{field}} field is required',
        'errors.validation.invalidEmail': 'Invalid email format',
        'errors.validation.invalidPhone': 'Invalid phone format',
        'errors.validation.invalidDate': 'Invalid date format',
        'errors.validation.invalidTime': 'Invalid time format',
        'errors.validation.passwordTooWeak': 'Password is too weak',
        'errors.validation.invalidFileType': 'Invalid file type',
        'errors.validation.fileTooLarge': 'File size is too large',
        'errors.validation.invalidUrl': 'Invalid URL format',
        
        // System Errors
        'errors.system.internalError': 'An error occurred. Please try again later',
        'errors.system.databaseError': 'Database error occurred',
        'errors.system.externalServiceError': 'External service error',
        'errors.system.rateLimitExceeded': 'Rate limit exceeded. Please try again after {{retryAfter}} seconds',
        'errors.system.maintenanceMode': 'System under maintenance',
        'errors.system.serviceUnavailable': 'Service unavailable',
        'errors.system.paymentProcessingError': 'Payment processing error',
        
        // Subscription Errors
        'errors.subscription.notFound': 'Subscription not found',
        'errors.subscription.expired': 'Subscription has expired',
        'errors.subscription.cancelled': 'Subscription cancelled',
        'errors.subscription.required': 'Subscription required',
        'errors.subscription.planLimitReached': 'Plan limit reached',
        
        // Notification Errors
        'errors.notification.smsDeliveryFailed': 'SMS delivery failed',
        'errors.notification.emailDeliveryFailed': 'Email delivery failed',
        'errors.notification.disabled': 'Notification disabled',
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
