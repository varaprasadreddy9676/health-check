// src/templates/components/Header.ts
import { layout } from '../styles/layout';
import { typography } from '../styles/typography';
import { colors } from '../styles/colors';
import { components } from '../styles/components';

interface HeaderProps {
  title: string;
  badgeText?: string;
  icon?: 'alert' | 'info' | 'success';
}

export const Header = ({ title, badgeText = 'Alert', icon = 'alert' }: HeaderProps): string => {
  const headerStyle = layout.header;
  
  const iconSVG = getIconSVG(icon);
  
  return `
    <div class="header" style="${headerStyle}">
      ${badgeText ? `<span class="alert-badge" style="${components.alertBadge}">${badgeText}</span>` : ''}
      <h1 style="color: ${colors.neutral.white}; ${typography.styles.h1}">${title}</h1>
      ${iconSVG ? `
      <div class="header-icon" style="position: absolute; top: 25px; right: 25px; width: 54px; height: 54px; background-color: rgba(255, 255, 255, 0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
        ${iconSVG}
      </div>` : ''}
    </div>
  `;
};

function getIconSVG(icon: 'alert' | 'info' | 'success'): string {
  switch (icon) {
    case 'alert':
      return `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C6.477 22 2 17.523 2 12C2 6.477 6.477 2 12 2C17.523 2 22 6.477 22 12C22 17.523 17.523 22 12 22ZM12 20C16.418 20 20 16.418 20 12C20 7.582 16.418 4 12 4C7.582 4 4 7.582 4 12C4 16.418 7.582 20 12 20ZM11 15H13V17H11V15ZM11 7H13V13H11V7Z" fill="black"/>
        </svg>
      `;
    case 'info':
      return `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C6.477 22 2 17.523 2 12C2 6.477 6.477 2 12 2C17.523 2 22 6.477 22 12C22 17.523 17.523 22 12 22ZM12 20C16.418 20 20 16.418 20 12C20 7.582 16.418 4 12 4C7.582 4 4 7.582 4 12C4 16.418 7.582 20 12 20ZM11 11H13V17H11V11ZM11 7H13V9H11V7Z" fill="black"/>
        </svg>
      `;
    case 'success':
      return `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C6.477 22 2 17.523 2 12C2 6.477 6.477 2 12 2C17.523 2 22 6.477 22 12C22 17.523 17.523 22 12 22ZM12 20C16.418 20 20 16.418 20 12C20 7.582 16.418 4 12 4C7.582 4 4 7.582 4 12C4 16.418 7.582 20 12 20ZM16.293 7.293L10 13.586L7.707 11.293L6.293 12.707L10 16.414L17.707 8.707L16.293 7.293Z" fill="black"/>
        </svg>
      `;
    default:
      return '';
  }
}