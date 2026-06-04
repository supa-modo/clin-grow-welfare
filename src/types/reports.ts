export type ExecutiveCharts = {
  memberStatusBreakdown: Array<{ status: string; count: number }>;
  contributionsByMonth: Array<{ month: string; amount: number }>;
  membersJoinedByMonth: Array<{ month: string; count: number }>;
};

export type ExecutiveReport = {
  totalMembers: number;
  activeMembers: number;
  nonCompliantMembers: number;
  totalFunds: number;
  welfareFundBalance: number;
  loanableFundBalance: number;
  activeLoans: number;
  totalLoanOutstanding: number;
  defaulters: number;
  pendingApprovals: number;
  pendingClaims: number;
  totalContributions: number;
  totalFines: number;
  finesIncome: number;
  loanInterestIncome: number;
  distributableIncome: number;
  charts: ExecutiveCharts;
};

export type FundBalanceRow = {
  fund: string;
  code: string;
  balance: number;
  isLoanable: boolean;
  isRestricted: boolean;
};

export type LoanAgingRow = {
  loanNumber: string;
  member: string;
  principalBalance: number;
  outstandingBalance: number;
  daysSinceDisbursement: number;
  agingBucket: string;
  status: string;
};

export type MeetingCollectionsReport = {
  items: Array<{
    meetingNumber: string;
    memberName: string;
    membershipNumber: string;
    collectionType: string;
    amount: number;
    postedAt: string;
  }>;
  totals: Record<string, number>;
};

export type ApprovalInboxItem = {
  id: string;
  entityType: string;
  status: string;
  entityId: string;
  requiredApprovers?: string[];
};

export type PortalDashboardData = {
  executive: ExecutiveReport | null;
  funds: FundBalanceRow[];
  aging: LoanAgingRow[];
  collections: MeetingCollectionsReport | null;
  approvals: ApprovalInboxItem[];
};
