// src/templates/components/DataTable.ts
import { layout } from '../styles/layout';
import { colors } from '../styles/colors';
import { components } from '../styles/components';
import { typography } from '../styles/typography';

// Define type for service types to ensure type safety
export type ServiceType = 'API' | 'PROCESS' | 'SERVICE' | 'SERVER';
export type HealthStatus = 'Healthy' | 'Unhealthy';

export interface HealthCheckData {
  serviceName: string;
  serviceType: ServiceType;
  status: HealthStatus;
  details: string;
}

export const DataTable = (data: HealthCheckData[]): string => {
  return `
    <table class="data-table" style="${layout.dataTable}">
      <thead>
        <tr>
          <th style="${layout.dataTableHeader}">Service</th>
          <th style="${layout.dataTableHeader}">Type</th>
          <th style="${layout.dataTableHeader}">Status</th>
          <th style="${layout.dataTableHeader}">Details</th>
        </tr>
      </thead>
      <tbody>
        ${data.map((item, index) => renderRow(item, index, data.length)).join('')}
      </tbody>
    </table>
  `;
};

function renderRow(item: HealthCheckData, index: number, totalRows: number): string {
  const isLastRow = index === totalRows - 1;
  const cellStyle = `${layout.dataTableCell} ${isLastRow ? layout.dataTableLastRow : ''}`;
  
  // Service Name Cell
  const serviceNameCell = `
    <td style="${cellStyle}">
      <span class="service-name" style="font-weight: ${typography.fontWeight.semibold}; color: ${colors.neutral.text.primary};">${item.serviceName}</span>
    </td>
  `;
  
  // Service Type Cell
  let serviceTypeStyle = components.serviceType;
  switch (item.serviceType) {
    case 'API':
      serviceTypeStyle += components.serviceTypeAPI;
      break;
    case 'PROCESS':
      serviceTypeStyle += components.serviceTypeProcess;
      break;
    case 'SERVICE':
      serviceTypeStyle += components.serviceTypeService;
      break;
    case 'SERVER':
      serviceTypeStyle += components.serviceTypeServer;
      break;
  }
  
  const serviceTypeCell = `
    <td style="${cellStyle}">
      <span class="service-type ${item.serviceType.toLowerCase()}" style="${serviceTypeStyle}">${item.serviceType}</span>
    </td>
  `;
  
  // Status Cell
  let statusBadgeStyle = components.statusBadge;
  statusBadgeStyle += item.status === 'Healthy' 
    ? components.statusBadgeHealthy 
    : components.statusBadgeUnhealthy;
  
  const statusCell = `
    <td style="${cellStyle}">
      <span class="status-badge ${item.status.toLowerCase()}" style="${statusBadgeStyle}">${item.status}</span>
    </td>
  `;
  
  // Details Cell
  const detailsCell = `
    <td class="details-cell" style="${cellStyle} color: ${colors.neutral.text.primary}; font-family: ${typography.fontFamily.monospace}; max-width: 350px; word-break: break-word;">
      ${formatDetails(item.details)}
    </td>
  `;
  
  return `<tr>${serviceNameCell}${serviceTypeCell}${statusCell}${detailsCell}</tr>`;
}

function formatDetails(details: string): string {
  // Detect and format URLs
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g;
  
  return details.replace(urlRegex, (url) => {
    const href = url.startsWith('http') ? url : `http://${url}`;
    return `<a href="${href}" style="color:${colors.primary.main};">${url}</a>`;
  });
}