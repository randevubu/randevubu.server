/**
 * Examples of how to use metrics throughout the application
 * This file demonstrates integration points for the metrics system
 */

import {
  recordDbQuery,
  recordError,
  recordAppointment,
  recordUserRegistration,
  recordPayment,
  recordSMS,
  recordPushNotification,
  recordBusinessSignup,
  recordSubscriptionRenewal,
  dbConnectionsActive,
  dbConnectionsIdle
} from './metrics';

// Example: Database query wrapper
export const withDbMetrics = async <T>(
  operation: string,
  table: string,
  queryFn: () => Promise<T>
): Promise<T> => {
  const start = Date.now();
  try {
    const result = await queryFn();
    recordDbQuery(operation, table, Date.now() - start);
    return result;
  } catch (error) {
    recordDbQuery(operation, table, Date.now() - start);
    recordError('database_query_error', 'medium');
    throw error;
  }
};

// Example: Service method wrapper for error tracking
export const withErrorTracking = async <T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    recordError(operation, 'high');
    throw error;
  }
};

// Example: How to integrate in appointment service
export const exampleAppointmentMetrics = {
  onAppointmentCreated: (businessType: string) => {
    recordAppointment('created', businessType);
  },

  onAppointmentCompleted: (businessType: string) => {
    recordAppointment('completed', businessType);
  },

  onAppointmentCancelled: (businessType: string) => {
    recordAppointment('cancelled', businessType);
  }
};

// Example: How to integrate in auth service
export const exampleAuthMetrics = {
  onUserRegistration: (userType: 'customer' | 'business_owner' | 'staff') => {
    recordUserRegistration(userType);
  },

  onLoginAttempt: (success: boolean) => {
    if (!success) {
      recordError('failed_login', 'low');
    }
  }
};

// Example: How to integrate in payment service
export const examplePaymentMetrics = {
  onPaymentProcessed: (amount: number, currency: string, success: boolean) => {
    const status = success ? 'success' : 'failed';
    recordPayment(status, 'subscription', amount, currency);
  },

  onRefundProcessed: (amount: number, currency: string, success: boolean) => {
    const status = success ? 'success' : 'failed';
    recordPayment(status, 'refund', amount, currency);
  }
};

// Example: How to integrate in notification service
export const exampleNotificationMetrics = {
  onSMSSent: (success: boolean, type: string) => {
    const status = success ? 'sent' : 'failed';
    recordSMS(status, type);
  },

  onPushNotificationSent: (success: boolean, type: string) => {
    const status = success ? 'sent' : 'failed';
    recordPushNotification(status, type);
  }
};

// Example: How to integrate in business service
export const exampleBusinessMetrics = {
  onBusinessSignup: (subscriptionPlan: string) => {
    recordBusinessSignup(subscriptionPlan);
  }
};

// Example: How to integrate in subscription service
export const exampleSubscriptionMetrics = {
  onSubscriptionRenewal: (planType: string, success: boolean) => {
    const status = success ? 'success' : 'failed';
    recordSubscriptionRenewal(planType, status);
  }
};

// Example: Database connection monitoring (to be called periodically)
export const updateDbConnectionMetrics = (activeCount: number, idleCount: number) => {
  dbConnectionsActive.set(activeCount);
  dbConnectionsIdle.set(idleCount);
};

/*
Integration Examples:

1. In AppointmentService.createAppointment():
   ```typescript
   const appointment = await this.appointmentRepository.create(data);
   recordAppointment('created', business.businessType.name);
   return appointment;
   ```

2. In AuthService.register():
   ```typescript
   const user = await this.userRepository.create(userData);
   recordUserRegistration('customer');
   return user;
   ```

3. In PaymentService.processPayment():
   ```typescript
   try {
     const result = await this.iyzipayService.charge(paymentData);
     recordPayment('success', 'subscription', amount, 'TRY');
     return result;
   } catch (error) {
     recordPayment('failed', 'subscription', amount, 'TRY');
     throw error;
   }
   ```

4. In any database repository:
   ```typescript
   async findById(id: string) {
     return withDbMetrics('select', 'users', () =>
       this.prisma.user.findUnique({ where: { id } })
     );
   }
   ```

5. For error handling in any service:
   ```typescript
   try {
     // service logic
   } catch (error) {
     recordError('service_operation_failed', 'high');
     throw error;
   }
   ```
*/