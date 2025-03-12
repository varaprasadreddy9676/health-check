// src/templates/components/StatusCard.ts
import { components } from '../styles/components';
import { typography } from '../styles/typography';
import { colors } from '../styles/colors';

type StatusType = 'healthy' | 'unhealthy' | 'warning';

interface StatusCardProps {
  title: string;
  message: string;
  status: StatusType;
}

export const StatusCard = ({ title, message, status }: StatusCardProps): string => {
  let statusCardStyle = components.statusCard;
  let dotColor = '';
  
  switch (status) {
    case 'healthy':
      statusCardStyle += components.statusCardHealthy;
      dotColor = colors.status.success.main;
      break;
    case 'unhealthy':
      statusCardStyle += components.statusCardUnhealthy;
      dotColor = colors.status.error.main;
      break;
    case 'warning':
      statusCardStyle += components.statusCardWarning;
      dotColor = colors.status.warning.main;
      break;
  }
  
  return `
    <div class="status-card ${status}" style="${statusCardStyle}">
      <div class="status-title" style="display: flex; align-items: center; margin-bottom: 10px;">
        <div class="status-dot" style="min-width: 12px; height: 12px; border-radius: 50%; background-color: ${dotColor}; margin-right: 10px; display: inline-block;"></div>
        <h3 style="${typography.styles.h3}">${title}</h3>
      </div>
      <p style="margin: 0 0 0 22px; font-size: ${typography.fontSize.md}; color: ${colors.neutral.text.secondary};">${message}</p>
    </div>
  `;
};