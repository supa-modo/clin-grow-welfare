import { api } from '@/services/api';
import type { Member, MemberFormValues, MembershipStatus } from '@/types/member';

export type MemberFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: MembershipStatus | '';
  complianceStatus?: string;
};

export const memberApi = {
  async list(filters: MemberFilters = {}) {
    const { data } = await api.get('/members', { params: { page: 1, pageSize: 20, ...filters } });
    return data as { data: Member[]; members: Member[]; meta: { page: number; totalPages: number; total: number; hasPrev: boolean; hasNext: boolean } };
  },
  async register(values: MemberFormValues) {
    const { data } = await api.post('/members/register', values);
    return data as { member: Member; message: string };
  },
  async create(values: MemberFormValues) {
    const { data } = await api.post('/members', values);
    return data.member as Member;
  },
  async update(id: string, values: Partial<MemberFormValues>) {
    const { data } = await api.patch(`/members/${id}`, values);
    return data.member as Member;
  },
  async get(id: string) {
    const { data } = await api.get(`/members/${id}`);
    return data.member as Member;
  },
  async approve(id: string, payload?: { approvalMeetingId?: string; approvalResolutionId?: string }) {
    const { data } = await api.post(`/members/${id}/approve`, payload ?? {});
    return data.member as Member;
  },
  async status(id: string, status: MembershipStatus, reason?: string) {
    const { data } = await api.post(`/members/${id}/status`, { status, reason });
    return data.member as Member;
  },
  async compliance(id: string) {
    const { data } = await api.get(`/members/${id}/compliance`);
    return data.summary;
  },
};

export const memberPortalApi = {
  async dashboard() {
    const { data } = await api.get('/member-portal/dashboard');
    return data.summary;
  },
  async profile() {
    const { data } = await api.get('/member-portal/profile');
    return data.member as Member;
  },
  async updateContact(values: { email?: string; phone?: string }) {
    const { data } = await api.patch('/member-portal/profile', values);
    return data.member as Member;
  },
  async beneficiaries() {
    const { data } = await api.get('/member-portal/beneficiaries');
    return data.beneficiaries;
  },
};
