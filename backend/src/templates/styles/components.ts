// src/templates/styles/components.ts
import { colors } from './colors';
import { typography } from './typography';

export const components = {
  statusBadge: `
    display: inline-block;
    padding: 4px 10px;
    border-radius: 4px;
    font-weight: ${typography.fontWeight.medium};
    font-size: ${typography.fontSize.sm};
  `,
  
  statusBadgeHealthy: `
    background-color: ${colors.status.success.light};
    color: ${colors.status.success.main};
  `,
  
  statusBadgeUnhealthy: `
    background-color: ${colors.status.error.light};
    color: ${colors.status.error.main};
  `,
  
  statusBadgeWarning: `
    background-color: ${colors.status.warning.light};
    color: ${colors.status.warning.main};
  `,
  
  serviceType: `
    display: inline-block;
    padding: 4px 10px;
    border-radius: 4px;
    font-weight: ${typography.fontWeight.medium};
    font-size: ${typography.fontSize.sm};
  `,
  
  serviceTypeAPI: `
    background-color: ${colors.serviceType.api.background};
    color: ${colors.serviceType.api.text};
  `,
  
  serviceTypeProcess: `
    background-color: ${colors.serviceType.process.background};
    color: ${colors.serviceType.process.text};
  `,
  
  serviceTypeService: `
    background-color: ${colors.serviceType.service.background};
    color: ${colors.serviceType.service.text};
  `,
  
  serviceTypeServer: `
    background-color: ${colors.serviceType.server.background};
    color: ${colors.serviceType.server.text};
  `,
  
  alertBadge: `
    display: inline-block;
    background-color: rgba(255, 255, 255, 0.15);
    border-radius: 50px;
    padding: 6px 12px;
    font-size: ${typography.fontSize.sm};
    font-weight: ${typography.fontWeight.medium};
    color: ${colors.neutral.white};
    margin-bottom: 12px;
  `,
  
  statusCard: `
    padding: 16px 20px;
    margin-bottom: 24px;
    border-radius: 8px;
  `,
  
  statusCardHealthy: `
    background-color: ${colors.status.success.light};
    border-left: 4px solid ${colors.status.success.main};
  `,
  
  statusCardUnhealthy: `
    background-color: ${colors.status.error.light};
    border-left: 4px solid ${colors.status.error.main};
  `,
  
  statusCardWarning: `
    background-color: ${colors.status.warning.light};
    border-left: 4px solid ${colors.status.warning.main};
  `,
  
  button: `
    display: inline-block;
    padding: 10px 18px;
    font-size: ${typography.fontSize.md};
    font-weight: ${typography.fontWeight.medium};
    text-decoration: none;
    border-radius: 6px;
    transition: background-color 0.2s;
  `,
  
  primaryButton: `
    background-color: ${colors.primary.main};
    color: ${colors.neutral.white};
  `,
  
  secondaryButton: `
    background-color: ${colors.neutral.white};
    color: ${colors.primary.main};
    border: 1px solid ${colors.neutral.border};
    margin-left: 10px;
  `
};