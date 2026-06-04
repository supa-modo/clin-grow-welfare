export type ContributionType = 'REGISTRATION' | 'SHARE_CAPITAL' | 'WEEKLY_SAVINGS' | 'WELFARE_KITTY' | 'EMERGENCY_CONTRIBUTION' | 'FINE_PAYMENT' | 'OTHER';
export type PaymentMethod = 'CASH' | 'BANK' | 'MPESA' | 'TRANSFER' | 'OTHER';
export type PostingStatus = 'PENDING' | 'POSTED' | 'REVERSED';

export interface Contribution {
  id: string;
  memberId: string;
  financialYearId: string;
  fundId: string;
  batchId?: string;
  contributionType: ContributionType;
  amount: number;
  periodDate: string;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  receiptNo?: string;
  reversalReason?: string;
  reversedById?: string;
  reversedAt?: string;
  status: PostingStatus;
  journalEntryId?: string;
  postedBy?: string;
  postedAt?: string;
  createdAt: string;
  member?: { id: string; name: string; membershipNumber: string };
  fund?: { id: string; name: string; code: string };
  meetingId?: string | null;
  meeting?: { id: string; meetingNumber: string } | null;
}

export interface ContributionBatch {
  id: string;
  batchNumber: string;
  financialYearId: string;
  totalRows: number;
  processedRows: number;
  failedRows: number;
  status: string;
  uploadedBy?: string;
  errors?: Array<{ row: number; error: string }>;
  createdAt: string;
}

export interface ArrearsData {
  expected: number;
  actual: number;
  arrears: number;
  status?: string;
  minimumRequired?: number;
  maximumAllowed?: number;
  windowClosesAt?: string;
  currentWeekPaid?: number;
  currentWeekMinimum?: number;
  unpaidPeriods?: number;
  unpaidMeetings?: Array<{
    id: string;
    meetingNumber: string;
    meetingDate: string;
  }>;
}

export interface MemberArrears {
  shareCapital: ArrearsData;
  weeklySavings: ArrearsData;
  welfareKitty: ArrearsData;
}
