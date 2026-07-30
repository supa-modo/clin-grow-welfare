import type { Loan } from "@/types/loan";

export const DEFAULT_LOAN_PERIOD_DAYS = 28;
export const MEETING_REPAYMENT_LOOKAHEAD_DAYS = 2;
const NAIROBI_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;

export type LoanDueInput = Pick<Loan, "disbursedAt" | "nextInterestDate"> & {
  status?: string;
};

export type LoanRepaymentBucket = "due" | "advance";

export function loanDueDate(loan: Pick<Loan, "disbursedAt" | "nextInterestDate">) {
  if (loan.nextInterestDate) {
    return new Date(loan.nextInterestDate).toISOString();
  }
  if (loan.disbursedAt) {
    const due = new Date(loan.disbursedAt);
    due.setDate(due.getDate() + DEFAULT_LOAN_PERIOD_DAYS);
    return due.toISOString();
  }
  return undefined;
}

export function meetingRepaymentWindow(meetingDate: Date | string) {
  const shifted = new Date(new Date(meetingDate).getTime() + NAIROBI_UTC_OFFSET_MS);
  const start = new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate())
    - NAIROBI_UTC_OFFSET_MS,
  );
  const end = new Date(
    start.getTime() + (MEETING_REPAYMENT_LOOKAHEAD_DAYS + 1) * 86_400_000 - 1,
  );
  return { start, end };
}

export function meetingRepaymentWindowEnd(meetingDate: Date | string) {
  return meetingRepaymentWindow(meetingDate).end;
}

export function loanRepaymentBucket(
  loan: LoanDueInput,
  meetingDate: Date | string,
): LoanRepaymentBucket {
  if (loan.status && ["OVERDUE", "DEFAULTED"].includes(loan.status)) {
    return "due";
  }
  const dueRaw = loanDueDate(loan);
  if (!dueRaw) return "due";
  const due = new Date(dueRaw);
  const end = meetingRepaymentWindowEnd(meetingDate);
  return due < end ? "due" : "advance";
}

function repaymentStatusRank(status: string) {
  if (status === "DEFAULTED") return 0;
  if (status === "OVERDUE") return 1;
  return 2;
}

export function compareLoansForRepayment(
  a: { dueDate?: string; status: string; memberName: string },
  b: { dueDate?: string; status: string; memberName: string },
) {
  const rankDiff = repaymentStatusRank(a.status) - repaymentStatusRank(b.status);
  if (rankDiff !== 0) return rankDiff;
  const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
  const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
  if (aDue !== bDue) return aDue - bDue;
  return a.memberName.localeCompare(b.memberName);
}

export function isLoanOverdue(dueDate: string | undefined, meetingDate: Date | string) {
  if (!dueDate) return false;
  const { start } = meetingRepaymentWindow(meetingDate);
  return new Date(dueDate) < start;
}

export function formatLoanDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
