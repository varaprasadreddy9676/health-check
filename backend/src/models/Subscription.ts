// Database-agnostic model for email subscriptions
export interface Subscription {
    id: string;
    email: string;
    healthCheckId: string | null; // null means subscribed to all health checks
    active: boolean;
    severity: 'all' | 'high' | 'critical';
    createdAt: Date;
    updatedAt: Date;
    verifiedAt?: Date | null;
    verifyToken?: string | null;
    unsubscribeToken: string;
    
    // Optional relation fields
    healthCheck?: {
      id: string;
      name: string;
      type: string;
    };
  }
  
  // DTO for creating a subscription
  export interface CreateSubscriptionDto {
    email: string;
    healthCheckId?: string;
    severity?: 'all' | 'high' | 'critical';
  }
  
  // DTO for updating a subscription
  export interface UpdateSubscriptionDto {
    active?: boolean;
    severity?: 'all' | 'high' | 'critical';
  }
  
  // Interface for subscription status response
  export interface SubscriptionStatusResponse {
    email: string;
    subscriptions: {
      id: string;
      healthCheckId: string | null;
      healthCheckName?: string;
      severity: string;
      active: boolean;
    }[];
  }