import { api } from './api';
import type { Contribution, ContributionBatch, MemberArrears } from '@/types/contribution';

export const contributionApi = {
  async list(params?: { page?: number; pageSize?: number; search?: string; status?: string; memberId?: string; type?: string; fundId?: string; from?: string; to?: string }) {
    const { data } = await api.get('/contributions', { params });
    return data as { data: Contribution[]; meta: any };
  },

  async get(id: string) {
    const { data } = await api.get(`/contributions/${id}`);
    return data.contribution as Contribution;
  },

  async post(input: { memberId: string; contributionType: string; amount: number; periodDate: string; paymentMethod: string; paymentReference?: string }) {
    const { data } = await api.post('/contributions', input);
    return data.contribution as Contribution;
  },

  async downloadReceipt(id: string) {
    const response = await api.get(`/contributions/${id}/receipt`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async reverse(id: string, reason: string) {
    const { data } = await api.post(`/contributions/${id}/reverse`, { reason });
    return data.contribution as Contribution;
  },

  async bulkUpload(file: File) {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post('/contributions/bulk-upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data.batch as ContributionBatch;
  },

  async getBatch(id: string) {
    const { data } = await api.get(`/contributions/batches/${id}`);
    return data.batch as ContributionBatch;
  },

  async getArrears(memberId?: string) {
    const { data } = await api.get('/contributions/arrears', { params: memberId ? { memberId } : {} });
    if (memberId) return data as { memberId: string; arrears: MemberArrears };
    return data as { data: Array<{ member: any; arrears: MemberArrears }> };
  },

  // Member portal
  async myContributions(params?: { page?: number; pageSize?: number }) {
    const { data } = await api.get('/member-portal/contributions', { params });
    return data as { data: Contribution[]; meta: any };
  },

  async myArrears() {
    const { data } = await api.get('/member-portal/contributions/arrears');
    return data as { arrears: MemberArrears };
  },

  async downloadMyReceipt(id: string) {
    const response = await api.get(`/member-portal/contributions/${id}/receipt`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
