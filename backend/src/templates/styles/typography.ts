// src/templates/styles/typography.ts
export const typography = {
    fontFamily: {
      primary: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      monospace: '"Cascadia Code", "SF Mono", Monaco, Menlo, Consolas, "Courier New", monospace'
    },
    
    fontSize: {
      xs: '11px',
      sm: '12px',
      md: '14px',
      lg: '16px',
      xl: '18px',
      '2xl': '20px',
      '3xl': '24px',
      '4xl': '28px'
    },
    
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    },
    
    lineHeight: {
      none: 1,
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.625
    },
    
    styles: {
      h1: `
        font-size: 28px;
        font-weight: 600;
        line-height: 1.2;
        margin: 0;
      `,
      h2: `
        font-size: 24px;
        font-weight: 600;
        line-height: 1.3;
        margin: 0;
      `,
      h3: `
        font-size: 18px;
        font-weight: 600;
        line-height: 1.4;
        margin: 0;
      `,
      body: `
        font-size: 14px;
        font-weight: 400;
        line-height: 1.5;
      `,
      caption: `
        font-size: 12px;
        font-weight: 400;
        line-height: 1.5;
      `,
      code: `
        font-family: "Cascadia Code", "SF Mono", Monaco, Menlo, Consolas, "Courier New", monospace;
        font-size: 13px;
        line-height: 1.5;
      `
    }
  };