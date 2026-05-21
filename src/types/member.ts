export type MembershipStatus = 'PENDING' | 'ACTIVE' | 'NON_COMPLIANT' | 'SUSPENDED' | 'WITHDRAWN' | 'EXPELLED' | 'DECEASED';

export type Beneficiary = {
  id: string;
  memberId: string;
  name: string;
  phone?: string | null;
  relationship: string;
  allocationPercentage: number;
  isPrimary: boolean;
  isActive: boolean;
};

export type Member = {
  id: string;
  membershipNumber: string;
  firstName: string;
  lastName: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  idNumber?: string | null;
  dateJoined: string;
  dateActive?: string | null;
  introducedByMemberId?: string | null;
  introducedBy?: Pick<Member, 'id' | 'membershipNumber' | 'firstName' | 'lastName' | 'name'> | null;
  status: MembershipStatus;
  registrationFeePaid: boolean;
  approvedAt?: string | null;
  approvedBy?: string | null;
  approvalMeetingId?: string | null;
  beneficiaryName: string;
  beneficiaryPhone: string;
  beneficiaryRelationship: string;
  nonComplianceReasons?: string | null;
  beneficiaries?: Beneficiary[];
  createdAt: string;
  updatedAt: string;
};

export type MemberFormValues = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  idNumber?: string;
  dateJoined?: string;
  introducedByMemberId?: string;
  registrationFeePaid?: boolean;
  beneficiaryName: string;
  beneficiaryPhone: string;
  beneficiaryRelationship: string;
};
