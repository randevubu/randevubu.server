// Payment Domain Types
export interface CreatePaymentRequest {
  businessId: string;
  amount: number;
  currency: string;
  description?: string;
  metadata?: any;
}
