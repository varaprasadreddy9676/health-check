import nodemailer from 'nodemailer';
import { env } from './env';
import logger from '../utils/logger';

// Create reusable transporter object using SMTP transport
export const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
  pool: true, // Use pooled connection for better performance
  maxConnections: 5,
  rateDelta: 1000 * 60,
  maxMessages: 100,
  tls: {
    rejectUnauthorized: true, // Verify server certificate
  }
});

/**
 * Verify email connection
 */
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    if (!env.SMTP_USER || !env.SMTP_PASS) {
      logger.warn('Email configuration incomplete. Email notifications will not work.');
      return false;
    }
    
    await transporter.verify();
    logger.info('Email service connected successfully');
    return true;
  } catch (error) {
    logger.error({
      msg: 'Email service verification failed',
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Send an email
 * @param to Recipient(s)
 * @param subject Email subject
 * @param html Email HTML content
 * @param text Plain text version (optional)
 */
export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
  text?: string
): Promise<boolean> {
  try {
    const recipients = Array.isArray(to) ? to.join(', ') : to;
    
    const mailOptions = {
      from: env.EMAIL_FROM,
      to: recipients,
      subject,
      html,
      text: text || '',
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    logger.info({
      msg: 'Email sent successfully',
      messageId: info.messageId,
      recipients
    });
    
    return true;
  } catch (error) {
    logger.error({
      msg: 'Failed to send email',
      error: error instanceof Error ? error.message : String(error),
      to
    });
    return false;
  }
}