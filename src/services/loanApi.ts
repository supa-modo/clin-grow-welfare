import { api } from './api';
import type { Loan, LoanEligibility, LoanStatement, AgingBuckets } from '@/types/loan';

export const loanApi = {
  async list(params?: { page?: number; pageSize?: number; search?: string; status?: string }) {
    const { data } = await api.get('/loans', { params });
    return data as { data: Loan[]; meta: any };
  },

  async get(id: string) {
    const { data } = await api.get(`/loans/${id}`);
    return data as { loan: Loan; statement: LoanStatement };
  },

  async getEligibility(memberId: string) {
    const { data } = await api.get(`/loans/eligibility/${memberId}`);
    return data.eligibility as LoanEligibility;
  },

  async apply(input: { memberId: string; requestedAmount: number; purpose?: string; termWeeks?: number }) {
    const { data } = await api.post('/loans', input);
    return data.loan as Loan;
  },

  async verify(id: string) {
    const { data } = await api.post(`/loans/${id}/verify`);
    return data.loan as Loan;
  },

  async approve(id: string, approvedAmount?: number) {
    const { data } = await api.post(`/loans/${id}/approve`, { approvedAmount });
    return data.loan as Loan;
  },

  async reject(id: string, reason: string) {
    const { data } = await api.post(`/loans/${id}/reject`, { reason });
    return data.loan as Loan;
  },

  async disburse(id: string) {
    const { data } = await api.post(`/loans/${id}/disburse`);
    return data.loan as Loan;
  },

  async generateAgreement(id: string) {
    const { data } = await api.post(`/loans/${id}/generate-agreement`);
    return data.loan as Loan;
  },

  async verifyAgreement(id: string) {
    const { data } = await api.post(`/loans/${id}/verify-agreement`);
    return data.loan as Loan;
  },

  async authorizeAgreement(id: string) {
    const { data } = await api.post(`/loans/${id}/authorize-agreement`);
    return data.loan as Loan;
  },

  async recordMemberAck(id: string) {
    const { data } = await api.post(`/loans/${id}/sign-agreement`);
    return data.loan as Loan;
  },

  async repay(id: string, input: { amount: number; paymentMethod: string; paymentReference?: string }) {
    const { data } = await api.post(`/loans/${id}/repay`, input);
    return data.repayment;
  },

  async downloadStatement(id: string, filename?: string) {
    const response = await api.get(`/loans/${id}/statement`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename ?? `statement-${id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async downloadAgreement(id: string, filename?: string) {
    const response = await api.get(`/loans/${id}/agreement`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename ?? `agreement-${id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async getDefaulters() {
    const { data } = await api.get('/loans/defaulters');
    return data as { data: Array<{ loan: Loan; monthsOverdue: number; outstandingBalance: number }>; total: number };
  },

  async getAging() {
    const { data } = await api.get('/loans/aging');
    return data.buckets as AgingBuckets;
  },

  async runMonthlyJob() {
    const { data } = await api.post('/loans/jobs/run-monthly');
    return data;
  },

  async getMemberLoans(memberId: string) {
    const { data } = await api.get(`/loans/member/${memberId}`);
    return data.loans as Loan[];
  },

  // Member portal
  async myEligibility() {
    const { data } = await api.get('/member-portal/loans/eligibility');
    return data.eligibility as LoanEligibility;
  },

  async myLoans() {
    const { data } = await api.get('/member-portal/loans');
    return data.loans as Loan[];
  },

  async applyMember(input: { requestedAmount: number; purpose?: string; termWeeks?: number }) {
    const { data } = await api.post('/member-portal/loans', input);
    return data.loan as Loan;
  },

  async myLoan(id: string) {
    const { data } = await api.get(`/member-portal/loans/${id}`);
    return data as { loan: Loan; statement: LoanStatement };
  },

  async downloadMyStatement(id: string, loanNumber?: string) {
    const response = await api.get(`/member-portal/loans/${id}/statement`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = loanNumber ? `statement-${loanNumber}.pdf` : `statement-${id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async downloadMyAgreement(id: string, loanNumber?: string) {
    const response = await api.get(`/member-portal/loans/${id}/agreement`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = loanNumber ? `agreement-${loanNumber}.pdf` : `agreement-${id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async acknowledgeMyAgreement(id: string) {
    const { data } = await api.post(`/member-portal/loans/${id}/acknowledge-agreement`);
    return data.loan as Loan;
  },
};
