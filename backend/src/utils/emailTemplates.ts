// src/utils/emailTemplates.ts
import { renderEmailTemplate, EMAIL_TEMPLATES } from '../templates';
import { HealthCheckData, ServiceType, HealthStatus } from '../templates/components/DataTable';
import path from 'path';
import fs from 'fs';
import logger from './logger';

// Create templates directory if it doesn't exist
function ensureDirectoriesExist(): void {
    const templateDirs = [
        path.join(process.cwd(), 'src', 'templates'),
        path.join(process.cwd(), 'src', 'templates', 'styles'),
        path.join(process.cwd(), 'src', 'templates', 'components'),
        path.join(process.cwd(), 'src', 'templates', 'templates')
    ];

    for (const dir of templateDirs) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
    logger.info('Email template directories created successfully');
}

/**
 * Render a health check alert email when a service is unhealthy
 * @param data Alert data containing service information
 * @returns Rendered HTML template ready to be sent
 */
export function renderHealthCheckAlertEmail(data: {
    subject: string;
    results: Array<{
        name: string;
        type: string | ServiceType;
        status: string | HealthStatus;
        details: string;
        cpuUsage?: number;
        memoryUsage?: number;
        responseTime?: number;
    }>;
    timestamp: Date;
    currentYear: number;
    unsubscribeUrl?: string;
    dashboardUrl?: string;
}): string {
    try {
        // Transform the data to match the DataTable component format and ensure type safety
        const tableData: HealthCheckData[] = data.results.map(result => {
            // Normalize type value to ensure it's one of the allowed ServiceType values
            let serviceType: ServiceType;
            if (result.type === 'API' ||
                result.type === 'PROCESS' ||
                result.type === 'SERVICE' ||
                result.type === 'SERVER') {
                serviceType = result.type;
            } else {
                // Default to 'SERVICE' if not matching expected values
                serviceType = 'SERVICE';
                logger.warn(`Invalid service type "${result.type}" normalized to "SERVICE"`);
            }

            // Normalize status value
            let status: HealthStatus;
            if (result.status === 'Healthy' || result.status === 'Unhealthy') {
                status = result.status;
            } else {
                // Default to 'Unhealthy' for alert emails if not matching expected values
                status = 'Unhealthy';
                logger.warn(`Invalid status "${result.status}" normalized to "Unhealthy"`);
            }

            return {
                serviceName: result.name,
                serviceType: serviceType,
                status: status,
                details: result.details
            };
        });

        const serviceName = data.results.length === 1 ? data.results[0].name : undefined;
        const hasSuccessfulRecovery = data.results.every(result =>
            result.status === 'Healthy' || result.status?.toLowerCase() === 'healthy');

        return renderEmailTemplate(EMAIL_TEMPLATES.HEALTH_CHECK_ALERT, {
            subject: data.subject,
            results: tableData,
            timestamp: data.timestamp,
            serviceName,
            hasSuccessfulRecovery,
            currentYear: data.currentYear,
            unsubscribeUrl: data.unsubscribeUrl,
            dashboardUrl: data.dashboardUrl
        });
    } catch (error) {
        logger.error({
            msg: 'Failed to render health check alert email template',
            error: error instanceof Error ? error.message : String(error)
        });
        return `<h1>${data.subject}</h1><p>Health check alert for ${data.results.map(r => r.name).join(', ')}</p>`;
    }
}

/**
 * Render a subscription verification email
 * @param data Subscription verification data
 * @returns Rendered HTML template ready to be sent
 */
export function renderSubscriptionVerificationEmail(data: {
    verifyUrl: string;
    unsubscribeUrl: string;
    healthCheckName: string;
    email: string;
    currentYear: number;
}): string {
    try {
        return renderEmailTemplate(EMAIL_TEMPLATES.SUBSCRIPTION_VERIFICATION, data);
    } catch (error) {
        logger.error({
            msg: 'Failed to render subscription verification email template',
            error: error instanceof Error ? error.message : String(error)
        });
        return `<h1>Verify Your Subscription</h1><p>Please verify your subscription by clicking this link: <a href="${data.verifyUrl}">${data.verifyUrl}</a></p>`;
    }
}

/**
 * Render a subscription confirmation email
 * @param data Subscription confirmation data
 * @returns Rendered HTML template ready to be sent
 */
export function renderSubscriptionConfirmedEmail(data: {
    unsubscribeUrl: string;
    healthCheckName: string;
    email: string;
    currentYear: number;
    dashboardUrl?: string;
}): string {
    try {
        return renderEmailTemplate(EMAIL_TEMPLATES.SUBSCRIPTION_CONFIRMED, data);
    } catch (error) {
        logger.error({
            msg: 'Failed to render subscription confirmed email template',
            error: error instanceof Error ? error.message : String(error)
        });
        return `<h1>Subscription Confirmed</h1><p>Your subscription to ${data.healthCheckName} has been confirmed.</p>`;
    }
}

// Export the template names for reuse
export { EMAIL_TEMPLATES, ServiceType, HealthStatus };

// Initialize email template system when the application starts
export function initializeEmailTemplates(): void {
    try {
        ensureDirectoriesExist();
        logger.info('Email template system initialized successfully');
    } catch (error) {
        logger.error({
            msg: 'Failed to initialize email template system',
            error: error instanceof Error ? error.message : String(error)
        });
    }
}
/**
 * This is a compatibility function that can be called in place of the old
 * createTemplateFiles() function, but it doesn't need to create physical files anymore
 * since our templates are now JavaScript/TypeScript functions
 */
export function createTemplateFiles(): void {
    logger.info('Email templates initialized successfully');
    // No action needed as templates are now code-based, not file-based
}