import { api } from '@/services/api';

export function money(value: unknown) {
  return `KES ${Number(value ?? 0).toLocaleString()}`;
}

export function tone(status?: string): 'neutral' | 'success' | 'warning' | 'danger' {
  if (!status) return 'neutral';
  if (['ACTIVE', 'APPROVED', 'PAID', 'POSTED', 'CLOSED', 'COMPLETED', 'SENT'].includes(status)) return 'success';
  if (['REJECTED', 'FAILED', 'DEFAULTED', 'CANCELLED'].includes(status)) return 'danger';
  if (['PENDING', 'SUBMITTED', 'PAYMENT_PENDING', 'COLLECTIONS_OPEN', 'LOAN_WINDOW_OPEN', 'ATTENDANCE_RECORDING'].includes(status)) return 'warning';
  return 'neutral';
}

export function getApiError(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response &&
    error.response.data &&
    typeof error.response.data === 'object' &&
    'error' in error.response.data
  ) {
    return String(error.response.data.error);
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export async function downloadReport(reportKey: string, format: 'pdf' | 'csv', params?: Record<string, string>) {
  const res = await api.get(`/reports/${reportKey}/export`, { params: { format, ...params }, responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${reportKey}.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function canApproveClaim(status: string) {
  return ['SUBMITTED', 'UNDER_REVIEW'].includes(status);
}

export function canPayClaim(status: string) {
  return ['APPROVED', 'PAYMENT_PENDING'].includes(status);
}

export function canRejectClaim(status: string) {
  return ['SUBMITTED', 'UNDER_REVIEW'].includes(status);
}
