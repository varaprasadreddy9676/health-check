// src/templates/index.ts
import Handlebars from 'handlebars';
import juice from 'juice';

// Import template modules
import { healthCheckAlertTemplate, HealthCheckAlertData } from './healthCheckAlert';
import { subscriptionVerificationTemplate, SubscriptionVerificationData } from './subscriptionVerification';
import { subscriptionConfirmedTemplate, SubscriptionConfirmedData } from './subscriptionConfirmed';

// Register Handlebars helpers
Handlebars.registerHelper('formatDate', function(date: Date | string) {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString();
});

Handlebars.registerHelper('eq', function(a: any, b: any) {
  return a === b;
});

Handlebars.registerHelper('neq', function(a: any, b: any) {
  return a !== b;
});

// Template names constants
export const EMAIL_TEMPLATES = {
  HEALTH_CHECK_ALERT: 'healthCheckAlert',
  SUBSCRIPTION_VERIFICATION: 'subscriptionVerification',
  SUBSCRIPTION_CONFIRMED: 'subscriptionConfirmed',
};

// Render and process templates
function processTemplate(html: string): string {
  // Use juice to inline all CSS
  return juice(html);
}

// Template rendering functions
export function renderHealthCheckAlert(data: HealthCheckAlertData): string {
  const html = healthCheckAlertTemplate(data);
  return processTemplate(html);
}

export function renderSubscriptionVerification(data: SubscriptionVerificationData): string {
  const html = subscriptionVerificationTemplate(data);
  return processTemplate(html);
}

export function renderSubscriptionConfirmed(data: SubscriptionConfirmedData): string {
  const html = subscriptionConfirmedTemplate(data);
  return processTemplate(html);
}

// Generic render function
export function renderEmailTemplate(templateName: string, data: Record<string, any>): string {
  try {
    switch (templateName) {
      case EMAIL_TEMPLATES.HEALTH_CHECK_ALERT:
        return renderHealthCheckAlert(data as HealthCheckAlertData);
      case EMAIL_TEMPLATES.SUBSCRIPTION_VERIFICATION:
        return renderSubscriptionVerification(data as SubscriptionVerificationData);
      case EMAIL_TEMPLATES.SUBSCRIPTION_CONFIRMED:
        return renderSubscriptionConfirmed(data as SubscriptionConfirmedData);
      default:
        throw new Error(`Unknown template: ${templateName}`);
    }
  } catch (error) {
    console.error(`Failed to render email template: ${templateName}`, error);
    return `<h1>${data.subject || 'Notification'}</h1><p>${data.message || 'No message provided.'}</p>`;
  }
}

// Export components
export { Header } from './components/Header';
export { StatusCard } from './components/StatusCard';
export { DataTable, type HealthCheckData } from './components/DataTable';
export { Footer } from './components/Footer';
export { Button } from './components/Button';

// Export styles
export { colors } from './styles/colors';
export { typography } from './styles/typography';
export { components } from './styles/components';
export { layout } from './styles/layout';

// Export template functions and interfaces with explicit naming
export { 
  healthCheckAlertTemplate,
  type HealthCheckAlertData 
} from './healthCheckAlert';

export { 
  subscriptionVerificationTemplate,
  type SubscriptionVerificationData 
} from './subscriptionVerification';

export { 
  subscriptionConfirmedTemplate,
  type SubscriptionConfirmedData 
} from './subscriptionConfirmed';