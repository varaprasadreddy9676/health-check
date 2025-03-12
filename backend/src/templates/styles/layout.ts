// src/templates/styles/layout.ts
import { colors } from './colors';

export const layout = {
  container: `
    max-width: 600px;
    margin: 0 auto;
    background-color: ${colors.neutral.white};
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  `,
  
  header: `
    background: ${colors.primary.gradient};
    padding: 30px 20px;
    text-align: left;
    position: relative;
  `,
  
  content: `
    padding: 30px;
  `,
  
  footer: `
    padding: 20px 30px;
    background-color: ${colors.neutral.background};
    border-top: 1px solid ${colors.neutral.border};
    text-align: center;
  `,
  
  dataTable: `
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 24px;
    background-color: ${colors.neutral.white};
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    overflow: hidden;
  `,
  
  dataTableHeader: `
    background-color: ${colors.neutral.background};
    padding: 12px 16px;
    text-align: left;
    font-weight: 600;
    font-size: 14px;
    color: ${colors.neutral.text.secondary};
    border-bottom: 1px solid ${colors.neutral.border};
  `,
  
  dataTableCell: `
    padding: 14px 16px;
    border-bottom: 1px solid ${colors.neutral.border};
    font-size: 14px;
    vertical-align: middle;
  `,
  
  dataTableLastRow: `
    border-bottom: none;
  `,
  
  responsiveStyles: `
    @media only screen and (max-width: 600px) {
      .header {
        padding: 20px;
      }
      
      .content {
        padding: 20px;
      }
      
      .footer {
        padding: 20px;
      }
      
      .data-table th, .data-table td {
        padding: 10px;
      }
      
      .button, .secondary-button {
        display: block;
        margin: 10px 0;
        text-align: center;
      }
    }
  `
};