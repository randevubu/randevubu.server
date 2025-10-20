// Notification Domain Services
export { NotificationService } from './notificationService';
export { NotificationAuditService } from './notificationAuditService';
export { NotificationMonitoringService } from './notificationMonitoringService';
export { NotificationRateLimitService } from './notificationRateLimitService';
export { SecureNotificationService } from './secureNotificationService';
export { UnifiedNotificationGateway } from './unifiedNotificationGateway';

// Export types
export {
  SecureNotificationRequest,
  SecureNotificationResult,
} from '../../../types/notification';

// Re-export request type defined in service implementation
export { BroadcastNotificationRequest } from './secureNotificationService';

// Re-export gateway types
export type {
  TransactionalNotificationRequest,
  MarketingNotificationRequest,
  SystemAlertRequest,
  BulkNotificationRequest,
  NotificationGatewayResult
} from './unifiedNotificationGateway';
