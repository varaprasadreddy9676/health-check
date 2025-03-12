import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import juice from 'juice';
import logger from './logger';

// Templates storage
const templates: Record<string, Handlebars.TemplateDelegate> = {};

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

/**
 * Load an email template
 * @param templateName The name of the template (without extension)
 * @returns Compiled Handlebars template
 */
export function getEmailTemplate(templateName: string): Handlebars.TemplateDelegate {
  // Return cached template if available
  if (templates[templateName]) {
    return templates[templateName];
  }
  
  try {
    // Path to template file
    const templateDir = path.join(process.cwd(), 'src', 'templates');
    const templatePath = path.join(templateDir, `${templateName}.html`);
    
    // Read template file
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    
    // Compile template
    const template = Handlebars.compile(templateSource);
    
    // Cache template
    templates[templateName] = template;
    
    return template;
  } catch (error) {
    logger.error({
      msg: `Failed to load email template: ${templateName}`,
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Return fallback template
    return Handlebars.compile('<h1>{{subject}}</h1><p>{{message}}</p>');
  }
}

/**
 * Generate HTML email content
 * @param templateName The name of the template to use
 * @param data Data to pass to the template
 * @returns HTML content with inlined CSS
 */
export function renderEmailTemplate(templateName: string, data: Record<string, any>): string {
  try {
    // Get template
    const template = getEmailTemplate(templateName);
    
    // Render template
    const html = template(data);
    
    // Inline CSS
    const htmlWithInlinedCss = juice(html);
    
    return htmlWithInlinedCss;
  } catch (error) {
    logger.error({
      msg: `Failed to render email template: ${templateName}`,
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Return fallback HTML
    return `<h1>${data.subject || 'Notification'}</h1><p>${data.message || 'No message provided.'}</p>`;
  }
}

// Templates
export const EMAIL_TEMPLATES = {
  HEALTH_CHECK_ALERT: 'healthCheckAlert',
  SUBSCRIPTION_VERIFICATION: 'subscriptionVerification',
  SUBSCRIPTION_CONFIRMED: 'subscriptionConfirmed',
};

// Define templates with inline CSS content
export function createTemplateFiles(): void {
  const templateDir = path.join(process.cwd(), 'src', 'templates');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(templateDir)) {
    fs.mkdirSync(templateDir, { recursive: true });
  }
  
  // Health Check Alert Template
  const healthCheckAlertTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #0066cc;
      color: white;
      padding: 20px;
      text-align: center;
    }
    .content {
      padding: 20px;
      background-color: #f9f9f9;
    }
    .footer {
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 10px;
      border: 1px solid #ddd;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
    }
    .healthy {
      color: #00cc00;
      font-weight: bold;
    }
    .unhealthy {
      color: #cc0000;
      font-weight: bold;
    }
    .btn {
      display: inline-block;
      padding: 10px 20px;
      background-color: #0066cc;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{subject}}</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>The following health checks have issues that require your attention:</p>
      
      <table>
        <thead>
          <tr>
            <th>Service</th>
            <th>Type</th>
            <th>Status</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {{#each results}}
          <tr>
            <td>{{name}}</td>
            <td>{{type}}</td>
            <td class="{{#eq status 'Healthy'}}healthy{{else}}unhealthy{{/eq}}">
              {{status}}
            </td>
            <td>{{details}}</td>
          </tr>
          {{/each}}
        </tbody>
      </table>
      
      <p>Report generated on {{formatDate timestamp}}</p>
      
      {{#if unsubscribeUrl}}
      <p>
        <a href="{{unsubscribeUrl}}" class="btn">Unsubscribe</a>
      </p>
      {{/if}}
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} Health Check Service</p>
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `;
  
  // Subscription Verification Template
  const subscriptionVerificationTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Subscription</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #0066cc;
      color: white;
      padding: 20px;
      text-align: center;
    }
    .content {
      padding: 20px;
      background-color: #f9f9f9;
    }
    .footer {
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    .btn {
      display: inline-block;
      padding: 10px 20px;
      background-color: #0066cc;
      color: white !important;
      text-decoration: none;
      border-radius: 4px;
      margin-top: 10px;
    }
    .link-box {
      background-color: #f2f2f2;
      padding: 10px;
      border-radius: 4px;
      margin: 20px 0;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Verify Your Subscription</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>Thank you for subscribing to health check notifications. Please verify your email address by clicking the button below:</p>
      
      <p style="text-align: center;">
        <a href="{{verifyUrl}}" class="btn">Verify My Email</a>
      </p>
      
      <p>You have subscribed to receive notifications for: <strong>{{healthCheckName}}</strong></p>
      
      <p>If you did not request this subscription, you can safely ignore this email.</p>
      
      <p>If the button above doesn't work, copy and paste this link into your browser:</p>
      
      <div class="link-box">
        {{verifyUrl}}
      </div>
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} Health Check Service</p>
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `;
  
  // Subscription Confirmed Template
  const subscriptionConfirmedTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Confirmed</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #00cc00;
      color: white;
      padding: 20px;
      text-align: center;
    }
    .content {
      padding: 20px;
      background-color: #f9f9f9;
    }
    .footer {
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    .btn {
      display: inline-block;
      padding: 10px 20px;
      background-color: #cc0000;
      color: white !important;
      text-decoration: none;
      border-radius: 4px;
      margin-top: 10px;
    }
    .service-box {
      background-color: #f2f2f2;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
      border-left: 4px solid #00cc00;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Subscription Confirmed</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>Your subscription to health check notifications has been confirmed. You will now receive alerts for:</p>
      
      <div class="service-box">
        <strong>{{healthCheckName}}</strong>
      </div>
      
      <p>You will receive notifications when services experience issues and when they recover.</p>
      
      <p style="text-align: center;">
        <a href="{{unsubscribeUrl}}" class="btn">Unsubscribe</a>
      </p>
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} Health Check Service</p>
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `;
  
  // Write templates to files
  fs.writeFileSync(path.join(templateDir, `${EMAIL_TEMPLATES.HEALTH_CHECK_ALERT}.html`), healthCheckAlertTemplate);
  fs.writeFileSync(path.join(templateDir, `${EMAIL_TEMPLATES.SUBSCRIPTION_VERIFICATION}.html`), subscriptionVerificationTemplate);
  fs.writeFileSync(path.join(templateDir, `${EMAIL_TEMPLATES.SUBSCRIPTION_CONFIRMED}.html`), subscriptionConfirmedTemplate);
  
  logger.info('Email templates created successfully');
}