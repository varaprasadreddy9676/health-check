// src/templates/components/Button.ts
import { components } from '../styles/components';

type ButtonVariant = 'primary' | 'secondary';

interface ButtonProps {
  text: string;
  url: string;
  variant?: ButtonVariant;
  className?: string;
}

export const Button = ({ text, url, variant = 'primary', className = '' }: ButtonProps): string => {
  let buttonStyle = components.button;
  
  switch (variant) {
    case 'primary':
      buttonStyle += components.primaryButton;
      break;
    case 'secondary':
      buttonStyle += components.secondaryButton;
      break;
  }
  
  return `
    <a href="${url}" class="${className || variant + '-button'}" style="${buttonStyle}">${text}</a>
  `;
};