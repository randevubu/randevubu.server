import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { config as appConfig } from '../../config/environment';
import logger from '../../utils/Logger/logger';

export interface SendEmailOptions {
  to: string;
  from?: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailService {
  private sesClient: SESClient;
  private fromEmail: string;
  private replyToEmail?: string;

  constructor() {
    const region = (appConfig as any).AWS_REGION;
    const fromEmail = process.env.AWS_SES_FROM_EMAIL || process.env.AWS_SES_REPLY_EMAIL || 'noreply@randevubu.com';
    const replyToEmail = process.env.AWS_SES_REPLY_EMAIL;

    if (!region) {
      logger.warn('AWS_REGION not configured. Email sending will be disabled.');
    }

    this.sesClient = new SESClient({
      region: region || 'us-east-1',
    });
    
    this.fromEmail = fromEmail;
    this.replyToEmail = replyToEmail;
  }

  async sendEmail(options: SendEmailOptions): Promise<EmailResult> {
    try {
      const { to, subject, html, text } = options;
      const fromEmail = options.from || this.fromEmail;
      const replyTo = options.replyTo || this.replyToEmail;

      // Validate email
      if (!to || !isValidEmail(to)) {
        logger.error('Invalid recipient email address', { to });
        return {
          success: false,
          error: 'Invalid recipient email address',
        };
      }

      // Ensure we have content
      if (!html && !text) {
        logger.error('Email must have either html or text content');
        return {
          success: false,
          error: 'Email must have either html or text content',
        };
      }

      const params = {
        Source: fromEmail,
        Destination: {
          ToAddresses: [to],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            ...(html && {
              Html: {
                Data: html,
                Charset: 'UTF-8',
              },
            }),
            ...(text && {
              Text: {
                Data: text,
                Charset: 'UTF-8',
              },
            }),
          },
        },
        ...(replyTo && {
          ReplyToAddresses: [replyTo],
        }),
      };

      const command = new SendEmailCommand(params);
      const response = await this.sesClient.send(command);

      logger.info('Email sent successfully', {
        to,
        subject,
        messageId: response.MessageId,
      });

      return {
        success: true,
        messageId: response.MessageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to send email', {
        to: options.to,
        subject: options.subject,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async sendContactFormEmail(
    name: string,
    email: string,
    phone: string,
    subject: string,
    message: string
  ): Promise<EmailResult> {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #8b5cf6; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .footer { margin-top: 20px; padding: 15px; background-color: #f3f4f6; text-align: center; border-radius: 0 0 5px 5px; }
            .info-row { margin: 10px 0; padding: 10px; background-color: white; border-left: 3px solid #8b5cf6; }
            .info-label { font-weight: bold; color: #6b7280; }
            .info-value { color: #111827; margin-top: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>📩 Yeni İletişim Mesajı</h2>
            </div>
            <div class="content">
              <div class="info-row">
                <div class="info-label">Ad Soyad:</div>
                <div class="info-value">${escapeHtml(name)}</div>
              </div>
              <div class="info-row">
                <div class="info-label">E-posta:</div>
                <div class="info-value">${escapeHtml(email)}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Telefon:</div>
                <div class="info-value">${escapeHtml(phone)}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Konu:</div>
                <div class="info-value">${escapeHtml(subject)}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Mesaj:</div>
                <div class="info-value">${escapeHtml(message).replace(/\n/g, '<br>')}</div>
              </div>
            </div>
            <div class="footer">
              <p style="margin: 0; color: #6b7280;">
                Bu mesaj RandevuBu iletişim formu aracılığıyla gönderilmiştir.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
Yeni İletişim Mesajı

Ad Soyad: ${name}
E-posta: ${email}
Telefon: ${phone}
Konu: ${subject}

Mesaj:
${message}

Bu mesaj RandevuBu iletişim formu aracılığıyla gönderilmiştir.
    `;

    return this.sendEmail({
      to: this.fromEmail,
      subject: `Yeni İletişim Mesajı: ${subject}`,
      html: htmlContent,
      text: textContent,
      replyTo: email,
    });
  }
}

// Helper function to validate email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper function to escape HTML
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Singleton instance
let emailServiceInstance: EmailService | null = null;

export const getEmailService = (): EmailService => {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService();
  }
  return emailServiceInstance;
};
