export type LoanStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'PENDING_MEETING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'AGREEMENT_PENDING' | 'READY_FOR_DISBURSEMENT' | 'DISBURSED' | 'ACTIVE' | 'PARTIALLY_PAID' | 'IN_ROLLOVER' | 'OVERDUE' | 'DEFAULTED' | 'RECOVERY' | 'CLOSED' | 'WRITTEN_OFF';

export interface LoanEligibility {
  memberId: string;
  baseAmount: number;
  shareCapital: number;
  weeklySavings: number;
  welfareKitty: number;
  multiplier: number;
  maxEligible: number;
  hasActiveLoan: boolean;
  note: string;
}

export interface LoanInterestCharge {
  id: string;
  loanId: string;
  periodNumber: number;
  chargeDate: string;
  principalBalance: number;
  interestAmount: number;
  compoundedInterest: number;
  journalEntryId?: string;
}

export interface LoanPenalty {
  id: string;
  loanId: string;
  penaltyDate: string;
  penaltyType: string;
  amount: number;
  reason?: string;
  journalEntryId?: string;
}

export interface LoanRepayment {
  id: string;
  loanId: string;
  paymentDate: string;
  amount: number;
  principalPaid: number;
  interestPaid: number;
  penaltyPaid: number;
  paymentMethod: string;
  paymentReference?: string;
  postedBy: string;
  journalEntryId?: string;
  reversedAt?: string | null;
}

export interface Loan {
  id: string;
  financialYearId: string;
  loanNumber: string;
  memberId: string;
  applicationDate: string;
  requestedAmount: number;
  approvedAmount?: number;
  interestRate: number;
  termWeeks?: number;
  purpose?: string;
  eligibilityCalculation?: LoanEligibility;
  status: LoanStatus;
  reviewedAt?: string;
  reviewedBy?: string;
  approvedAt?: string;
  approvedBy?: string;
  agreementSignedAt?: string;
  memberAcknowledgedAt?: string;
  treasurerVerifiedAt?: string;
  chairpersonAuthorizedAt?: string;
  agreementGeneratedAt?: string;
  disbursedAt?: string;
  disbursedBy?: string;
  disbursementJournalEntryId?: string;
  outstandingPrincipal?: number;
  totalOutstanding?: number;
  currentRolloverMonth: number;
  lastInterestPeriod: number;
  nextInterestDate?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  closedAt?: string;
  createdAt: string;
  member?: { id: string; name: string; membershipNumber: string; email?: string; phone?: string };
  repayments?: LoanRepayment[];
  interestCharges?: LoanInterestCharge[];
  penalties?: LoanPenalty[];
}

export interface LoanStatement {
  loan: Loan;
  disbursed: number;
  totalInterest: number;
  totalPenalties: number;
  totalRepaid: number;
  outstanding: number;
}

export interface AgingBuckets {
  '0-30': Array<{ loan: Loan; daysOverdue: number; outstanding: number }>;
  '31-60': Array<{ loan: Loan; daysOverdue: number; outstanding: number }>;
  '61-90': Array<{ loan: Loan; daysOverdue: number; outstanding: number }>;
  '90+': Array<{ loan: Loan; daysOverdue: number; outstanding: number }>;
}
