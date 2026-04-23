import { apiRequest, API_BASE, tokenStore } from './client';

export type ReportDto = {
  id: string;
  taskId: string;
  taskNumber: string;
  deviceCount: number;
  deviceJson?: unknown | null;
  createdAt: string;
};

export async function uploadReport(
  taskId: string,
  payload: {
    html: string;
    taskNumber?: string;
    deviceCount?: number;
    deviceJson?: unknown;
  },
): Promise<ReportDto> {
  const data = await apiRequest<{ report: ReportDto }>(
    `/api/tasks/${taskId}/reports`,
    { method: 'POST', body: payload },
  );
  return data.report;
}

export async function listReports(taskId: string): Promise<ReportDto[]> {
  const data = await apiRequest<{ reports: ReportDto[] }>(
    `/api/tasks/${taskId}/reports`,
  );
  return data.reports;
}

export async function getReportDeviceJson(
  reportId: string,
): Promise<ReportDto> {
  return apiRequest<ReportDto>(`/api/reports/${reportId}/device-json`);
}

export async function getReportUrl(reportId: string): Promise<string> {
  await tokenStore.ready();
  const tok = tokenStore.get();
  const q = tok ? `?token=${encodeURIComponent(tok)}` : '';
  return `${API_BASE}/api/reports/${reportId}${q}`;
}
