export type MeetingStep = 'attendance' | 'fines' | 'collections' | 'repayments' | 'summary' | 'loans' | 'close';

export type MeetingRecord = {
  id: string;
  meetingNumber: string;
  meetingType: string;
  meetingDate: string;
  venue?: string;
  agenda?: string;
  status: string;
  minutes?: string;
  attendance?: unknown[];
  collectionSessions?: Array<{ id: string; status: string; items?: unknown[] }>;
  collectionItems?: Array<{ collectionType: string; amount: number; status: string }>;
  loanWindows?: Array<{
    id: string;
    status: string;
    remainingAmount?: number;
    totalLoanablePool?: number;
    reservations?: LoanReservation[];
  }>;
  report?: { summary?: Record<string, unknown> } | null;
};

export type LoanReservation = {
  id: string;
  status: string;
  amount: number;
  memberId: string;
  member?: { name: string };
  loan?: {
    id: string;
    loanNumber?: string;
    status: string;
    requestedAmount?: number;
    outstandingPrincipal?: number;
    agreementGeneratedAt?: string;
    memberAcknowledgedAt?: string;
    treasurerVerifiedAt?: string;
    chairpersonAuthorizedAt?: string;
  };
};

export type RosterMember = {
  member: { id: string; name: string; membershipNumber: string };
  attendance?: { attendanceStatus?: string } | null;
  apology?: { id: string; status: string; reason: string } | null;
  expectations: {
    weeklySavings: { paidThisWeek: number; min: number; max: number; remainingToMax: number };
    shareCapital: { paidToDate: number; max: number; remaining: number };
    welfareKitty: { paidThisMonth: number; dueThisMonth: number };
    fines: { pendingTotal: number; rows: Array<{ id: string; fineType: string; amount: number; status: string }> };
    loans: { active: Array<{ id: string; loanNumber?: string; outstandingPrincipal?: number }>; outstandingTotal: number };
  };
};

export type MeetingRoster = {
  meeting: MeetingRecord;
  settings: {
    lateFine: number;
    absentWithApologyFine: number;
    absentWithoutApologyFine: number;
    minWeeklySavings: number;
    maxWeeklySavings: number;
    maxShareCapital: number;
    monthlyWelfareContribution: number;
  };
  members: RosterMember[];
};

export type LoanPool = {
  totalLoanablePool: number;
  reservedAmount: number;
  remainingAmount: number;
};
