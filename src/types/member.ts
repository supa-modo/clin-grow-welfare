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

export type MemberDependantDocument = {
  id: string;
  dependantId: string;
  documentType: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy?: string | null;
  createdAt: string;
};

export type MemberUserRef = {
  id: string;
  name: string | null;
  email?: string | null;
};

export type MemberDependant = {
  id: string;
  memberId: string;
  fullName: string;
  relationship: string;
  dateOfBirth?: string | null;
  idNumber?: string | null;
  phone?: string | null;
  notes?: string | null;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  verifiedByName?: string | null;
  verifiedByUser?: MemberUserRef | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  documents?: MemberDependantDocument[];
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
  dateOfBirth?: string | null;
  staffStatus?: string | null;
  profileImageUpdatedAt?: string | null;
  constitutionAcceptedAt?: string | null;
  constitutionAcceptedBy?: string | null;
  introducedByMemberId?: string | null;
  introducedBy?: Pick<Member, 'id' | 'membershipNumber' | 'firstName' | 'lastName' | 'name'> | null;
  status: MembershipStatus;
  registrationFeePaid: boolean;
  approvedAt?: string | null;
  approvedBy?: string | null;
  approvedByName?: string | null;
  approver?: MemberUserRef | null;
  approvalMeetingId?: string | null;
  beneficiaryName: string;
  beneficiaryPhone: string;
  beneficiaryRelationship: string;
  nonComplianceReasons?: string | null;
  balances?: {
    shareCapital: number;
    weeklySavings: number;
    welfareKitty: number;
    loanEligibilityBase: number;
    activeLoanBalance: number;
    finesBalance: number;
  };
  beneficiaries?: Beneficiary[];
  dependants?: MemberDependant[];
  createdAt: string;
  updatedAt: string;
};

export type MemberDependantFormValues = {
  fullName: string;
  relationship: string;
  dateOfBirth?: string;
  idNumber?: string;
  phone?: string;
  notes?: string;
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
