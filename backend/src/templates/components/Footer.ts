// src/templates/components/Footer.ts
import { layout } from '../styles/layout';
import { colors } from '../styles/colors';
import { Button } from './Button';

interface FooterProps {
  timestamp: string;
  year: number;
  primaryButton?: {
    text: string;
    url: string;
  };
  secondaryButton?: {
    text: string;
    url: string;
  };
}

export const Footer = ({ timestamp, year, primaryButton, secondaryButton }: FooterProps): string => {
  return `
    <div class="footer" style="${layout.footer}">
      <div class="timestamp" style="font-size: 13px; color: ${colors.neutral.text.secondary}; margin-bottom: 16px;">
        Report generated on ${timestamp}
      </div>
      
      ${primaryButton ? Button({
        text: primaryButton.text,
        url: primaryButton.url,
        variant: 'primary'
      }) : ''}
      
      ${secondaryButton ? Button({
        text: secondaryButton.text,
        url: secondaryButton.url,
        variant: 'secondary'
      }) : ''}
      
      <div class="copyright" style="margin-top: 24px; font-size: 12px; color: ${colors.neutral.text.tertiary};">
        &copy; ${year} Health Check Service
      </div>
      
      <div class="disclaimer" style="font-size: 11px; color: ${colors.neutral.text.tertiary}; margin-top: 8px;">
        This is an automated message. Please do not reply to this email.
      </div>
    </div>
  `;
};