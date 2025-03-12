// src/templates/templates/subscriptionConfirmed.ts
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Button } from './components/Button';
import { layout } from './styles/layout';
import { colors } from './styles/colors';
import { typography } from './styles/typography';

export interface SubscriptionConfirmedData {
  unsubscribeUrl: string;
  healthCheckName: string;
  email: string;
  currentYear: number;
  dashboardUrl?: string;
}

export const subscriptionConfirmedTemplate = (data: SubscriptionConfirmedData): string => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Subscription Confirmed</title>
      <style>
        /* Base styles */
        :root {
          color-scheme: light dark;
        }
        
        body {
          font-family: ${typography.fontFamily.primary};
          line-height: ${typography.lineHeight.normal};
          color: ${colors.neutral.text.primary};
          background-color: ${colors.neutral.background};
          margin: 0;
          padding: 0;
        }
        
        .service-box {
          background-color: ${colors.neutral.backgroundAlt};
          padding: 16px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid ${colors.status.success.main};
        }
        
        ${layout.responsiveStyles}
      </style>
    </head>
    <body>
      <div class="email-container" style="${layout.container}">
        <!-- Header -->
        ${Header({
          title: 'Subscription Confirmed',
          badgeText: 'Confirmed',
          icon: 'success'
        })}
        
        <!-- Content -->
        <div class="content" style="${layout.content}">
          <p style="${typography.styles.body}">Hello,</p>
          
          <p style="${typography.styles.body}">Your subscription to health check notifications has been confirmed. You will now receive alerts for:</p>
          
          <div class="service-box">
            <strong style="${typography.styles.body}">${data.healthCheckName}</strong>
          </div>
          
          <p style="${typography.styles.body}">You will receive notifications when services experience issues and when they recover.</p>
          
          <p style="text-align: center; margin: 30px 0;">
            ${data.dashboardUrl ? Button({
              text: 'View Dashboard',
              url: data.dashboardUrl,
              variant: 'primary'
            }) : ''}
            
            ${Button({
              text: 'Unsubscribe',
              url: data.unsubscribeUrl,
              variant: 'secondary'
            })}
          </p>
        </div>
        
        <!-- Footer -->
        ${Footer({
          timestamp: new Date().toLocaleString(),
          year: data.currentYear
        })}
      </div>
    </body>
    </html>
  `;
};