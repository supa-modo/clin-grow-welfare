export type FinancialYearStatus = 'OPEN' | 'CLOSING' | 'CLOSED' | 'AUDITED';
export type JournalStatus = 'DRAFT' | 'POSTED' | 'REVERSED';
export type LedgerAccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';

export interface WelfareSetting {
  id: string;
  financialYearId: string;
  registrationFeeAmount: number;
  minShareCapital: number;
  maxShareCapital: number;
  minWeeklySavings: number;
  maxWeeklySavings: number;
  monthlyWelfareContribution: number;
  loanInterestRateMonthly: number;
  loanMultiplierLimit: number;
  loanStandardTermDays: number;
  loanMaxRolloverMonths: number;
  latePenaltyRate: number;
  loanLatePenaltyFixed: number;
  monthlyAbsentFineWithApology: number;
  monthlyAbsentFineWithoutApology: number;
}

export interface FinancialYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  savingsStopDate?: string;
  agmDate?: string;
  status: FinancialYearStatus;
  settings?: WelfareSetting;
  createdAt: string;
  _count?: { journalEntries: number; contributions: number };
}

export interface Fund {
  id: string;
  name: string;
  code: string;
  type: string;
  isMemberContributionFund: boolean;
  isLoanable: boolean;
  isShareable: boolean;
  isRestricted: boolean;
  isActive: boolean;
}

export interface LedgerAccount {
  id: string;
  code: string;
  name: string;
  type: LedgerAccountType;
  fundId?: string;
  parentId?: string;
  isSystemAccount: boolean;
  isActive: boolean;
  fund?: { id: string; name: string; code: string };
  children?: LedgerAccount[];
}

export interface JournalLine {
  id: string;
  ledgerAccountId: string;
  memberId?: string;
  fundId?: string;
  debitAmount: number;
  creditAmount: number;
  description?: string;
  ledgerAccount?: LedgerAccount;
  fund?: Fund;
  member?: { id: string; name: string; membershipNumber: string };
}

export interface JournalEntry {
  id: string;
  entryNo: string;
  financialYearId: string;
  transactionDate: string;
  description: string;
  reference?: string;
  sourceType?: string;
  sourceId?: string;
  status: JournalStatus;
  createdBy?: string;
  postedAt?: string;
  reversalOfId?: string;
  reversalReason?: string;
  lines: JournalLine[];
  financialYear?: { name: string };
  reversalOf?: { entryNo: string };
  reversedBy?: { entryNo: string };
  createdAt: string;
}

export interface MemberBalances {
  shareCapital: number;
  weeklySavings: number;
  welfareKitty: number;
  loanEligibilityBase: number;
  activeLoanBalance: number;
  finesBalance: number;
}
