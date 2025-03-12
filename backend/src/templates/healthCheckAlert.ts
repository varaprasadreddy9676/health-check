// src/templates/templates/healthCheckAlert.ts
import { Header } from './components/Header';
import { StatusCard } from './components/StatusCard';
import { DataTable, HealthCheckData } from './components/DataTable';
import { Footer } from './components/Footer';
import { layout } from './styles/layout';
import { colors } from './styles/colors';
import { typography } from './styles/typography';

export interface HealthCheckAlertData {
  subject: string;
  results: HealthCheckData[];
  timestamp: Date;
  serviceName?: string;
  hasSuccessfulRecovery?: boolean;
  currentYear: number;
  unsubscribeUrl?: string;
  dashboardUrl?: string;
}

export const healthCheckAlertTemplate = (data: HealthCheckAlertData): string => {
  // Determine the severity based on results
  const hasUnhealthy = data.results.some(result => result.status === 'Unhealthy');
  const statusTitle = hasUnhealthy ? 'Critical Issue Detected' : 'Service Status Update';
  const statusMessage = data.hasSuccessfulRecovery
    ? `${data.serviceName || 'Service'} has recovered and is now operational.`
    : `${data.serviceName || 'Service'} has failed its health check and requires immediate attention.`;
  
  const statusCardStatus = hasUnhealthy ? 'unhealthy' : 'healthy';
  
  // Format the timestamp
  const formattedTimestamp = data.timestamp.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true
  });
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>${data.subject}</title>
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
        
        ${layout.responsiveStyles}
      </style>
    </head>
    <body>
      <div class="email-container" style="${layout.container}">
        <!-- Header -->
        ${Header({
          title: data.subject,
          badgeText: hasUnhealthy ? 'Alert' : 'Info',
          icon: hasUnhealthy ? 'alert' : (data.hasSuccessfulRecovery ? 'success' : 'info')
        })}
        
        <!-- Content -->
        <div class="content" style="${layout.content}">
          <p style="${typography.styles.body}">Hello,</p>
          
          <p style="${typography.styles.body}">The following health checks have issues that require your attention:</p>
          
          <!-- Status Card -->
          ${StatusCard({
            title: statusTitle,
            message: statusMessage,
            status: statusCardStatus
          })}
          
          <!-- Data Table -->
          ${DataTable(data.results)}
          
          <p style="${typography.styles.body}">
            Our monitoring system detected this issue at <strong>${formattedTimestamp}</strong>. 
            ${hasUnhealthy 
              ? 'Automatic recovery attempts have been initiated, but manual intervention may be required.' 
              : 'The system is operating normally now.'}
          </p>
          
          ${data.unsubscribeUrl ? 
            `<p style="${typography.styles.body}">
              <a href="${data.unsubscribeUrl}" style="color: ${colors.primary.main}; text-decoration: none;">
                Manage notification preferences or unsubscribe
              </a>
            </p>` 
            : ''}
        </div>
        
        <!-- Footer -->
        ${Footer({
          timestamp: formattedTimestamp,
          year: data.currentYear,
          primaryButton: data.dashboardUrl ? {
            text: 'View Dashboard',
            url: data.dashboardUrl
          } : undefined,
          secondaryButton: hasUnhealthy ? {
            text: 'Acknowledge',
            url: '#acknowledge'
          } : undefined
        })}
      </div>
    </body>
    </html>
  `;
};