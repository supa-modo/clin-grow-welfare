import { api } from '@/services/api';
import type { Member, MemberDependant, MemberDependantDocument, MemberDependantFormValues, MemberFormValues, MembershipStatus } from '@/types/member';

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
  async resetPassword(id: string) {
    const { data } = await api.post(`/members/${id}/reset-password`);
    return data as { ok: boolean; tempPassword?: string };
  },
  async status(id: string, status: MembershipStatus, reason?: string) {
    const { data } = await api.post(`/members/${id}/status`, { status, reason });
    return data.member as Member;
  },
  async setConstitutionAcknowledgement(id: string, accepted: boolean) {
    const { data } = await api.post(`/members/${id}/constitution-acknowledgement`, { accepted });
    return data.member as Member;
  },
  async setAllConstitutionAcknowledgements(accepted: boolean) {
    const { data } = await api.post('/members/constitution-acknowledgements', { accepted });
    return data as { count: number };
  },
  async compliance(id: string) {
    const { data } = await api.get(`/members/${id}/compliance`);
    return data.summary;
  },
  async dependants(id: string) {
    const { data } = await api.get(`/members/${id}/dependants`);
    return data.dependants as MemberDependant[];
  },
  async createDependant(id: string, values: MemberDependantFormValues) {
    const { data } = await api.post(`/members/${id}/dependants`, values);
    return data.dependant as MemberDependant;
  },
  async updateDependant(id: string, dependantId: string, values: Partial<MemberDependantFormValues>) {
    const { data } = await api.patch(`/members/${id}/dependants/${dependantId}`, values);
    return data.dependant as MemberDependant;
  },
  async verifyDependant(id: string, dependantId: string) {
    const { data } = await api.post(`/members/${id}/dependants/${dependantId}/verify`);
    return data.dependant as MemberDependant;
  },
  async uploadDependantDocument(id: string, dependantId: string, file: File, documentType = 'DEPENDANT_PROOF') {
    const form = new FormData();
    form.append('file', file);
    form.append('documentType', documentType);
    const { data } = await api.post(`/members/${id}/dependants/${dependantId}/documents`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data.document as MemberDependantDocument;
  },
  dependantDocumentUrl(id: string, dependantId: string, documentId: string) {
    return `/members/${id}/dependants/${dependantId}/documents/${documentId}/download`;
  },
  async pendingDependants() {
    const { data } = await api.get('/members/dependants/pending');
    return data.dependants as Array<MemberDependant & { member: { id: string; name: string; membershipNumber: string } }>;
  },
  async beneficiaryChangeRequests(status = 'PENDING') {
    const { data } = await api.get('/members/beneficiary-change-requests', { params: { status } });
    return data.requests as BeneficiaryChangeRequest[];
  },
  async approveBeneficiaryChange(requestId: string) {
    const { data } = await api.post(`/members/beneficiary-change-requests/${requestId}/approve`);
    return data;
  },
  async rejectBeneficiaryChange(requestId: string, rejectionReason?: string) {
    const { data } = await api.post(`/members/beneficiary-change-requests/${requestId}/reject`, { rejectionReason });
    return data.request as BeneficiaryChangeRequest;
  },
};

export type BeneficiaryChangeRequest = {
  id: string;
  memberId: string;
  status: string;
  proposedName: string;
  proposedPhone?: string | null;
  proposedRelationship: string;
  proposedIdNumber?: string | null;
  note?: string | null;
  member?: {
    id: string;
    name: string;
    membershipNumber: string;
    beneficiaryName?: string;
    beneficiaryPhone?: string;
    beneficiaryRelationship?: string;
  };
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
  async uploadAvatar(file: File) {
    const form = new FormData();
    form.append('avatar', file);
    const { data } = await api.post('/member-portal/profile/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data.member as Member;
  },
  async beneficiaries() {
    const { data } = await api.get('/member-portal/beneficiaries');
    return data.beneficiaries;
  },
  async dependants() {
    const { data } = await api.get('/member-portal/dependants');
    return data.dependants as MemberDependant[];
  },
  async createDependant(values: MemberDependantFormValues) {
    const { data } = await api.post('/member-portal/dependants', values);
    return data.dependant as MemberDependant;
  },
  async updateDependant(dependantId: string, values: Partial<MemberDependantFormValues>) {
    const { data } = await api.patch(`/member-portal/dependants/${dependantId}`, values);
    return data.dependant as MemberDependant;
  },
  async uploadDependantDocument(dependantId: string, file: File, documentType = 'DEPENDANT_PROOF') {
    const form = new FormData();
    form.append('file', file);
    form.append('documentType', documentType);
    const { data } = await api.post(`/member-portal/dependants/${dependantId}/documents`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data.document as MemberDependantDocument;
  },
  dependantDocumentUrl(dependantId: string, documentId: string) {
    return `/member-portal/dependants/${dependantId}/documents/${documentId}/download`;
  },
  async beneficiaryChangeRequest() {
    const { data } = await api.get('/member-portal/beneficiaries/change-request');
    return data.request as BeneficiaryChangeRequest | null;
  },
  async submitBeneficiaryChange(values: {
    proposedName: string;
    proposedPhone?: string;
    proposedRelationship: string;
    proposedIdNumber?: string;
    note?: string;
  }) {
    const { data } = await api.post('/member-portal/beneficiaries/request-change', values);
    return data as { request: BeneficiaryChangeRequest; message: string };
  },
};
