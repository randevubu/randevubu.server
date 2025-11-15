/**
 * SMS Message Templates
 * 
 * Centralized location for all SMS message templates used throughout the application.
 * This follows industry best practices for message template management.
 * 
 * All messages are in Turkish as per application requirements.
 */

import { VerificationPurpose } from '@prisma/client';

/**
 * Verification Code Message Templates
 */
export class VerificationCodeMessages {
  private static readonly CODE_EXPIRY_MINUTES = 10;

  /**
   * Get verification code message based on purpose
   */
  static getMessage(code: string, purpose: VerificationPurpose): string {
    const expiryText = `Bu kod ${VerificationCodeMessages.CODE_EXPIRY_MINUTES} dakika geçerlidir.`;

    switch (purpose) {
      case 'PHONE_CHANGE':
        return `RandevuBu telefon numaranızı değiştirmek için doğrulama kodunuz: ${code}\n\n${expiryText}`;

      case 'REGISTRATION':
        return `RandevuBu'ya hoş geldiniz! Kayıt doğrulama kodunuz: ${code}\n\n${expiryText}`;

      case 'LOGIN':
        return `RandevuBu giriş doğrulama kodunuz: ${code}\n\n${expiryText}`;

      case 'ACCOUNT_RECOVERY':
        return `RandevuBu hesap kurtarma doğrulama kodunuz: ${code}\n\n${expiryText}`;

      case 'STAFF_INVITATION':
        return `RandevuBu personel davetiyesi doğrulama kodunuz: ${code}\n\n${expiryText}`;

      default:
        return `RandevuBu doğrulama kodunuz: ${code}\n\n${expiryText}`;
    }
  }
}

/**
 * Appointment Message Templates
 */
export class AppointmentMessages {
  /**
   * Appointment booking confirmation message
   */
  static bookingConfirmation(params: {
    businessName: string;
    serviceName: string;
    appointmentDate: string;
    appointmentTime: string;
    appointmentId: string;
  }): string {
    return `Randevunuz onaylandı!\n\n${params.businessName}\n${params.serviceName}\n${params.appointmentDate} - ${params.appointmentTime}\n\nİptal için: https://randevubu.com/appointments/${params.appointmentId}`;
  }

  /**
   * Appointment reminder message
   */
  static reminder(params: {
    businessName: string;
    serviceName: string;
    appointmentDate: string;
    appointmentTime: string;
    appointmentId: string;
  }): string {
    return `${params.businessName} randevu hatırlatması: ${params.serviceName} hizmetiniz ${params.appointmentDate} tarihinde saat ${params.appointmentTime}'de. Detaylar: https://randevubu.com/appointments/${params.appointmentId}`;
  }

  /**
   * Appointment cancellation message
   */
  static cancellation(params: {
    businessName: string;
    serviceName: string;
    appointmentDate: string;
    appointmentTime: string;
  }): string {
    return `${params.businessName} randevu iptali: ${params.serviceName} hizmetiniz için ${params.appointmentDate} ${params.appointmentTime} tarihli randevunuz iptal edilmiştir.`;
  }

  /**
   * Appointment rescheduled message
   */
  static rescheduled(params: {
    businessName: string;
    serviceName: string;
    oldDate: string;
    oldTime: string;
    newDate: string;
    newTime: string;
    appointmentId: string;
  }): string {
    return `${params.businessName} randevu değişikliği: ${params.serviceName} hizmetiniz için randevunuz ${params.oldDate} ${params.oldTime} tarihinden ${params.newDate} ${params.newTime} tarihine taşınmıştır. Detaylar: https://randevubu.com/appointments/${params.appointmentId}`;
  }
}

/**
 * Business Notification Message Templates
 */
export class BusinessMessages {
  /**
   * Business closure notification message
   */
  static closureNotification(params: {
    businessName: string;
    reason: string;
    startDate: string;
    endDate?: string;
    businessId: string;
  }): string {
    const dateText = params.endDate
      ? `${params.startDate} - ${params.endDate}`
      : params.startDate;

    return `${params.businessName} bilgilendirme: ${params.reason}. ${dateText} tarihinde kapıyız. Detaylar: https://randevubu.com/business/${params.businessId}`;
  }

  /**
   * Business reopening notification message
   */
  static reopeningNotification(params: {
    businessName: string;
    reopenDate: string;
    businessId: string;
  }): string {
    return `${params.businessName} bilgilendirme: ${params.reopenDate} tarihinde tekrar açılıyoruz. Detaylar: https://randevubu.com/business/${params.businessId}`;
  }

  /**
   * New appointment booking notification for business owner
   */
  static newAppointmentBooking(params: {
    customerName: string;
    serviceName: string;
    appointmentDate: string;
    appointmentTime: string;
    appointmentId: string;
  }): string {
    return `Yeni Randevu: ${params.customerName} ${params.serviceName} hizmeti için ${params.appointmentDate} ${params.appointmentTime} tarihine randevu oluşturdu. Detaylar: https://randevubu.com/appointments/${params.appointmentId}`;
  }
}

/**
 * Staff Invitation Message Templates
 */
export class StaffMessages {
  /**
   * Staff invitation message (not verification code, but informational)
   */
  static invitation(params: {
    businessName: string;
    role: string;
    inviterName?: string;
  }): string {
    const inviterText = params.inviterName
      ? `${params.inviterName} tarafından `
      : '';

    return `${params.businessName} ${inviterText}${params.role} olarak davet edildiniz. RandevuBu uygulamasına kayıt olarak davetinizi kabul edebilirsiniz.`;
  }
}

/**
 * Test Message Templates
 */
export class TestMessages {
  /**
   * SMS service test message
   */
  static serviceTest(): string {
    return `RandevuBu SMS servisi test mesajıdır. Bu mesaj NetGSM API entegrasyonunu test etmek için gönderilmiştir.`;
  }
}

/**
 * Default export - Main SMS Message Templates utility
 */
export const SMSMessageTemplates = {
  verification: VerificationCodeMessages,
  appointment: AppointmentMessages,
  business: BusinessMessages,
  staff: StaffMessages,
  test: TestMessages,
};

export default SMSMessageTemplates;

