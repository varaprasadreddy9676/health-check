// src/templates/styles/colors.ts
export const colors = {
    // Primary brand colors
    primary: {
      light: '#6366F1',    // Indigo 500
      main: '#4F46E5',     // Indigo 600
      dark: '#4338CA',     // Indigo 700
      gradient: 'linear-gradient(135deg, #6366F1 0%, #4338CA 100%)'
    },
    
    // Neutral colors
    neutral: {
      white: '#FFFFFF',
      background: '#F9FAFB',  // Gray 50
      backgroundAlt: '#F3F4F6', // Gray 100
      border: '#E5E7EB',     // Gray 200
      borderAlt: '#D1D5DB',  // Gray 300
      text: {
        primary: '#111827',  // Gray 900
        secondary: '#4B5563', // Gray 600
        tertiary: '#9CA3AF'  // Gray 400
      }
    },
    
    // Status colors
    status: {
      success: {
        light: '#ECFDF5',  // Green 50
        main: '#10B981',   // Green 500
        dark: '#059669'    // Green 600
      },
      warning: {
        light: '#FFFBEB',  // Amber 50
        main: '#F59E0B',   // Amber 500
        dark: '#D97706'    // Amber 600
      },
      error: {
        light: '#FEF2F2',  // Red 50
        main: '#EF4444',   // Red 500
        dark: '#DC2626'    // Red 600
      },
      info: {
        light: '#EFF6FF',  // Blue 50
        main: '#3B82F6',   // Blue 500
        dark: '#2563EB'    // Blue 600
      }
    },
    
    // Service type colors
    serviceType: {
      api: {
        background: '#EFF6FF',  // Blue 50
        text: '#3B82F6'         // Blue 500
      },
      process: {
        background: '#F5F3FF',  // Purple 50
        text: '#8B5CF6'         // Purple 500
      },
      service: {
        background: '#ECFDF5',  // Green 50
        text: '#10B981'         // Green 500
      },
      server: {
        background: '#FFFBEB',  // Amber 50
        text: '#F59E0B'         // Amber 500
      }
    }
  };