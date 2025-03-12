// src/templates/templates/subscriptionVerification.ts
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Button } from './components/Button';
import { layout } from './styles/layout';
import { colors } from './styles/colors';
import { typography } from './styles/typography';

export interface SubscriptionVerificationData {
  verifyUrl: string;
  unsubscribeUrl: string;
  healthCheckName: string;
  email: string;
  currentYear: number;
}

export const subscriptionVerificationTemplate = (data: SubscriptionVerificationData): string => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Verify Your Subscription</title>
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
        
        .link-box {
          background-color: ${colors.neutral.backgroundAlt};
          padding: 12px;
          border-radius: 6px;
          margin: 20px 0;
          word-break: break-all;
          font-family: ${typography.fontFamily.monospace};
          font-size: ${typography.fontSize.sm};
          color: ${colors.neutral.text.primary};
        }
        
        ${layout.responsiveStyles}
      </style>
    </head>
    <body>
      <div class="email-container" style="${layout.container}">
        <!-- Header -->
        ${Header({
          title: 'Verify Your Subscription',
          badgeText: 'Action Required',
          icon: 'info'
        })}
        
        <!-- Content -->
        <div class="content" style="${layout.content}">
          <p style="${typography.styles.body}">Hello,</p>
          
          <p style="${typography.styles.body}">Thank you for subscribing to health check notifications. Please verify your email address by clicking the button below:</p>
          
          <p style="text-align: center; margin: 30px 0;">
            ${Button({
              text: 'Verify My Email',
              url: data.verifyUrl,
              variant: 'primary'
            })}
          </p>
          
          <p style="${typography.styles.body}">You have subscribed to receive notifications for: <strong>${data.healthCheckName}</strong></p>
          
          <p style="${typography.styles.body}">If you did not request this subscription, you can safely ignore this email.</p>
          
          <p style="${typography.styles.body}">If the button above doesn't work, copy and paste this link into your browser:</p>
          
          <div class="link-box">
            ${data.verifyUrl}
          </div>
        </div>
        
        <!-- Footer -->
        ${Footer({
          timestamp: new Date().toLocaleString(),
          year: data.currentYear,
          secondaryButton: {
            text: 'Unsubscribe',
            url: data.unsubscribeUrl
          }
        })}
      </div>
    </body>
    </html>
  `;
};