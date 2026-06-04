import { api } from './api';

export type PaymentVoucher = {
  id: string;
  voucherNo: string;
  entityType: string;
  entityId: string;
  amount: number;
  status: string;
  description: string;
  signatories: Array<{ role: string; signedBy: string }>;
};

export const voucherApi = {
  async list(pendingOnly = false) {
    const { data } = await api.get('/vouchers', { params: pendingOnly ? { pending: 'true' } : {} });
    return data.data as PaymentVoucher[];
  },

  async approve(id: string) {
    const { data } = await api.post(`/vouchers/${id}/approve`);
    return data.voucher as PaymentVoucher;
  },

  async sign(id: string) {
    const { data } = await api.post(`/vouchers/${id}/sign`);
    return data.voucher as PaymentVoucher;
  },
};
