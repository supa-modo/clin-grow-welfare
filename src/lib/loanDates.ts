import type { Loan } from "@/types/loan";

export function loanDueDate(loan: Pick<Loan, "disbursedAt" | "nextInterestDate">) {
  if (loan.disbursedAt) {
    const due = new Date(loan.disbursedAt);
    due.setMonth(due.getMonth() + 1);
    return due.toISOString();
  }
  return loan.nextInterestDate;
}

export function formatLoanDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
