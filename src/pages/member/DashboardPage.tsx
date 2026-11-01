import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  LuArrowDownLeft,
  LuArrowRight,
  LuArrowUpRight,
  LuCalendarDays,
  LuHandCoins,
  LuLandmark,
  LuShieldCheck,
} from "react-icons/lu";
import { Badge } from "@/components/ui/Badge";
import { RepaymentProgress } from "@/components/member/MemberFinancePrimitives";
import { formatLoanDate, loanDueDate } from "@/lib/loanDates";
import { api } from "@/services/api";
import { contributionApi } from "@/services/contributionApi";
import { loanApi } from "@/services/loanApi";
import { memberPortalApi } from "@/services/memberApi";
import { useAuthStore } from "@/store/auth";
import { RefreshIconButton } from "@/components/ui/RefreshIconButton";
import { MemberContributionsTrendChart } from "@/components/member/MemberContributionsTrendChart";
import { useMemberDistribution } from "@/hooks/useMemberDistribution";
import { memberDate, memberMoney } from "@/services/memberDistribution";
import type { MemberDashboardSummary } from "@/components/member/dashboard/MemberDashboardSections";
import { TbChevronsRight } from "react-icons/tb";

type Summary = MemberDashboardSummary & {
  financialYear?: { name: string; startDate: string; endDate: string } | null;
};
type MemberMeeting = {
  id: string;
  meetingNumber: string;
  meetingDate: string;
  venue?: string | null;
  virtualLink?: string | null;
  status: string;
};
const dateKey = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

export function MemberDashboardPage() {
  const userId = useAuthStore((state) => state.user?.id);
  const common = { staleTime: 0, gcTime: 0, retry: 1 };
  const summary = useQuery({
    ...common,
    queryKey: ["member-dashboard", userId],
    queryFn: async () => (await memberPortalApi.dashboard()) as Summary,
  });
  const loans = useQuery({
    ...common,
    queryKey: ["dashboard-loans", userId],
    queryFn: loanApi.myLoans,
  });
  const meetings = useQuery({
    ...common,
    queryKey: ["dashboard-meetings", userId],
    queryFn: async () =>
      (await api.get<{ meetings: MemberMeeting[] }>("/member-portal/meetings"))
        .data.meetings,
  });
  const contributions = useQuery({
    ...common,
    queryKey: ["dashboard-contributions", userId],
    queryFn: async () => {
      const result = await contributionApi.myContributions({
        page: 1,
        pageSize: 5,
      });
      if (!Array.isArray(result.data))
        throw new Error("Contribution history is unavailable");
      return result;
    },
  });
  const distribution = useMemberDistribution();
  const activeLoans = (loans.data ?? []).filter(
    (loan) =>
      loan.disbursedAt &&
      !["CLOSED", "WRITTEN_OFF", "REJECTED"].includes(loan.status),
  );
  const primaryLoan = activeLoans[0];
  const loanDetail = useQuery({
    ...common,
    queryKey: ["dashboard-loan-detail", userId, primaryLoan?.id],
    queryFn: () =>
      primaryLoan ? loanApi.myLoan(primaryLoan.id) : Promise.resolve(null),
    enabled: Boolean(primaryLoan),
  });
  const repayment = (() => {
    const statement = loanDetail.data?.statement;
    if (!primaryLoan || !statement) return null;
    const totalDue =
      Number(
        statement.disbursed ??
          primaryLoan.approvedAmount ??
          primaryLoan.requestedAmount ??
          0,
      ) +
      Number(statement.totalInterest ?? 0) +
      Number(statement.totalPenalties ?? 0);
    const repaid = Number(statement.totalRepaid ?? 0);
    return {
      totalDue,
      repaid,
      outstanding: Number(
        statement.outstanding ?? primaryLoan.outstandingPrincipal ?? 0,
      ),
      progress: totalDue > 0 ? Math.round((repaid / totalDue) * 100) : 0,
      dueDate: loanDueDate(primaryLoan),
    };
  })();
  if (summary.isPending)
    return (
      <p role="status" className="py-14 text-center text-sm text-slate-600">
        Loading your account overview…
      </p>
    );
  if (summary.isError || !summary.data)
    return (
      <div role="alert" className="py-12 text-sm text-slate-600">
        <p>
          Your account overview could not be loaded. No balances are being
          estimated.
        </p>
        <RefreshIconButton
          className="mt-4"
          title="Try again"
          onClick={() => void summary.refetch()}
        />
      </div>
    );
  const member = summary.data;
  const balance = member.financialSummary;
  const capital =
    (Math.round(Number(balance.shareCapital) * 100) +
      Math.round(Number(balance.weeklySavings) * 100)) /
    100;
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: "Africa/Nairobi",
    }).format(new Date()),
  );
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const preview =
    !distribution.isError && distribution.data?.enabled
      ? distribution.data
      : null;
  const now = new Date();
  const nextMeeting = !meetings.isError
    ? (meetings.data ?? [])
        .filter((meeting) => {
          if (["CLOSED", "COMPLETED", "CANCELLED"].includes(meeting.status))
            return false;
          const date = new Date(meeting.meetingDate);
          return (
            date >= now ||
            (dateKey(date) === dateKey(now) &&
              !["SCHEDULED", "NOTICE_SENT"].includes(meeting.status))
          );
        })
        .sort(
          (a, b) =>
            new Date(a.meetingDate).getTime() -
            new Date(b.meetingDate).getTime(),
        )[0]
    : undefined;

  return (
    <div className="space-y-4 lg:space-y-6 pb-1 lg:pb-2">
      <header className="flex flex-wrap items-start justify-between gap-2 pb-1 pt-4">
        <div>
          <p className="text-sm font-bold leading-6 text-secondary-600">
            Your member account
          </p>
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-[#102e26] lg:text-3xl">
            {greeting}, {member.firstName || "member"}.
          </h1>
        </div>
        <div className="flex flex-wrap gap-x-3 text-xs leading-6 text-slate-600 sm:block sm:rounded-xl sm:border sm:border-slate-200 sm:bg-white sm:px-4 sm:py-2 sm:text-right">
          <p className="font-semibold text-slate-700">
            Member {member.membershipNumber}
          </p>
          <p>
            {member.financialYear?.name || "Account overview"} ·{" "}
            {memberDate(new Date().toISOString())}
          </p>
        </div>
      </header>

      <div
        className={`grid min-w-0 gap-4 ${preview ? "lg:grid-cols-[1.35fr_1fr]" : ""}`}
      >
        <section
          aria-label="Your capital"
          className="relative isolate min-w-0 overflow-hidden rounded-2xl lg:rounded-3xl bg-[linear-gradient(120deg,#083c32_0%,#075e46_65%,#087f5b_100%)] p-2 text-white shadow-[0_12px_30px_-12px_rgba(6,78,59,0.5)] md:p-4 pl-3 md:pl-4 lg:pl-5"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-28 -z-10 h-80 w-80 rounded-full border-[40px] border-white/[0.06]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-40 right-10 -z-10 h-80 w-80 rounded-full border border-emerald-200/20"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs md:text-[0.8rem] lg:text-sm font-semibold text-emerald-50">
              Share capital + savings
            </p>
            <Link
              to="/member/statements"
              className="inline-flex lg:min-h-8 shrink-0 items-center gap-1 rounded-full border border-white/25 bg-white/10 px-3 py-0.5 text-[0.7rem] lg:text-xs font-semibold text-white transition hover:bg-white/20"
            >
              Statement
              <LuArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <p className="mt-2 wrap-break-word text-2xl md:text-3xl  font-extrabold font-google leading-tight   lg:text-4xl">
            {memberMoney(capital)}
          </p>
          <p className="mt-1 lg:mt-2 max-w-sm text-xs md:text-[0.8rem] lg:text-sm leading-6 text-emerald-50">
            Your total welfare capital.
          </p>
          <dl className="mt-2 lg:mt-4 grid grid-cols-2 gap-4 border-t border-white/25 pt-2 lg:pt-3">
            <div>
              <dt className="text-xs md:text-[0.8rem] lg:text-sm text-emerald-50">
                Share capital
              </dt>
              <dd className="mt-1 wrap-break-word text-base font-extrabold font-google  md:text-lg lg:text-xl">
                {memberMoney(balance.shareCapital)}
              </dd>
            </div>
            <div>
              <dt className="text-xs md:text-[0.8rem] lg:text-sm text-emerald-50">
                Savings
              </dt>
              <dd className="mt-1 wrap-break-word text-base font-extrabold font-google  sm:text-xl">
                {memberMoney(balance.weeklySavings)}
              </dd>
            </div>
          </dl>
        </section>
        {preview && (
          <section
            aria-label="Distribution preview"
            className="relative flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl lg:rounded-3xl border border-emerald-200 bg-[linear-gradient(135deg,#ecfdf5_0%,#f7fee7_100%)] p-2.5 shadow-[0_8px_24px_-18px_rgba(6,78,59,0.3)] md:p-4 md:px-5"
          >
            <div>
              <div className="flex items-start justify-between gap-2 lg:gap-3">
                <p className="text-xs md:text-[0.8rem] lg:text-sm font-semibold leading-6 text-emerald-900">
                  {preview.status === "APPROVED"
                    ? "Approved income share"
                    : "Projected year-end income share"}
                </p>
              </div>
              {preview.status === "UNAVAILABLE" ? (
                <p className="mt-1 text-xs md:text-[0.8rem] lg:text-sm leading-6 text-slate-600">
                  Your estimate will appear once the underlying balances are
                  reconciled.
                </p>
              ) : (
                <>
                  <p className="mt-1 wrap-break-word text-xl md:text-2xl font-extrabold font-google  leading-tight  text-[#102e26] lg:text-4xl">
                    {memberMoney(preview.allocation.projectedShare)}
                  </p>
                  <p className="mt-2 text-xs md:text-[0.8rem] lg:text-sm leading-6 text-slate-700">
                    {preview.status === "APPROVED"
                      ? "Saved AGM-approved allocation."
                      : "Based on recorded amounts, with no assumed future income. This is not an approved payout."}
                  </p>
                </>
              )}
            </div>
            <Link
              to="/member/distribution"
              className="mt-1 inline-flex lg:min-h-8 py-1.5 lg:py-2 items-center gap-2 self-start rounded-lg lg:rounded-xl bg-[#075e46] px-4 md:px-5 text-xs md:text-[0.8rem] lg:text-sm font-semibold text-white shadow-sm transition hover:bg-[#064e3b]"
            >
              View more details
              <TbChevronsRight className="h-4 w-4" />
            </Link>
          </section>
        )}
      </div>
      {distribution.isError && (
        <p className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          The distribution preview could not be loaded.
          <RefreshIconButton
            size="sm"
            title="Try again"
            onClick={() => void distribution.refetch()}
          />
        </p>
      )}

      <div className="overflow-hidden lg:rounded-3xl lg:border border-slate-200 lg:bg-white lg:shadow-[0_8px_32px_-24px_rgba(15,23,42,0.3)]">
        <div className="grid lg:grid-cols-[1.2fr_1fr]">
          <div className="min-w-0 border-b border-slate-200 lg:border-b-0 lg:border-r">
            <MemberContributionsTrendChart flat />
          </div>
          <section className="min-w-0 mt-4 lg:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm lg:text-base font-bold text-[#102e26]">
                Your loans & welfare
              </h2>
              <Link
                to="/member/loans"
                className="text-xs md:text-[0.8rem] lg:text-sm font-semibold text-secondary-700"
              >
                View loans
              </Link>
            </div>

            {loans.isPending ? (
              <p role="status" className="mt-4 text-xs text-slate-600">
                Loading loan details…
              </p>
            ) : loans.isError ? (
              <p className="mt-4 text-xs text-slate-600">
                Loan details could not be loaded. Open your loans page for
                statements.
              </p>
            ) : primaryLoan && repayment ? (
              <section
                aria-label="Loan repayment progress"
                className="relative overflow-hidden mt-4 lg:mt-6 rounded-r-2xl lg:rounded-r-3xl border border-slate-200 bg-white p-4 shadow-[0_8px_32px_-24px_rgba(15,23,42,0.3)] sm:p-5"
              >
                <span
                  aria-hidden="true"
                  className={`absolute inset-y-0 left-0 w-1 ${["OVERDUE", "DEFAULTED"].includes(primaryLoan.status) ? "bg-rose-500" : "bg-emerald-600"}`}
                />
                <div className="flex flex-col gap-2 md:gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold text-slate-600">
                          {primaryLoan.loanNumber}
                        </p>
                        <Badge
                          size="xs"
                          tone={
                            ["OVERDUE", "DEFAULTED"].includes(
                              primaryLoan.status,
                            )
                              ? "danger"
                              : ["PARTIALLY_PAID", "IN_ROLLOVER"].includes(
                                    primaryLoan.status,
                                  )
                                ? "warning"
                                : "success"
                          }
                        >
                          {primaryLoan.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="mt-1 wrap-break-word font-google text-xl font-extrabold tabular-nums text-[#102e26]">
                        {memberMoney(repayment.outstanding)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Outstanding
                        {repayment.dueDate
                          ? ` · due ${formatLoanDate(repayment.dueDate)}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <RepaymentProgress
                    progress={repayment.progress}
                    repaidLabel={`Repaid ${memberMoney(repayment.repaid)}`}
                    totalDueLabel={`Due ${memberMoney(repayment.totalDue)}`}
                    tone={
                      ["OVERDUE", "DEFAULTED"].includes(primaryLoan.status)
                        ? "danger"
                        : "success"
                    }
                  />
                </div>
                {activeLoans.length > 1 && (
                  <p className="mt-3 text-xs text-slate-500">
                    +{activeLoans.length - 1} more active loan
                    {activeLoans.length > 2 ? "s" : ""} on your loans page.
                  </p>
                )}
              </section>
            ) : (
              <p className="mt-3 text-xs leading-5 text-slate-600">
                {Number(balance.activeLoanBalance) > 0
                  ? "Open your loan statements for the recorded balance breakdown."
                  : "No active disbursed loans in your account."}
              </p>
            )}
          </section>
        </div>
        <section className=" mt-4 lg:mt-6 lg:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm lg:text-base font-bold text-[#102e26]">
              Your recent contributions
            </h2>
            <Link
              to="/member/contributions"
              className="text-xs md:text-[0.8rem] lg:text-sm font-semibold text-secondary-700"
            >
              View all
            </Link>
          </div>
          {contributions.isPending ? (
            <p role="status" className="py-8 text-sm text-slate-600">
              Loading your contributions…
            </p>
          ) : contributions.isError ? (
            <p
              role="alert"
              className="flex flex-wrap items-center gap-2 py-5 text-sm text-slate-600"
            >
              Recent contributions could not be loaded.
              <RefreshIconButton
                size="sm"
                title="Try again"
                onClick={() => void contributions.refetch()}
              />
            </p>
          ) : !contributions.data?.data.length ? (
            <p className="py-6 text-sm text-slate-600">
              No contributions have been recorded yet.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {contributions.data.data.map((row) => (
                <li key={row.id} className="flex items-start gap-3 py-3">
                  <span className="mt-0.5 rounded-xl bg-emerald-100 p-2.5 text-emerald-800">
                    <LuArrowDownLeft className="h-4 w-4 shrink-0" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold capitalize text-slate-900">
                      {row.contributionType.replace(/_/g, " ").toLowerCase()}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      {memberDate(row.periodDate)}
                      {row.meeting?.meetingNumber
                        ? ` · ${row.meeting.meetingNumber}`
                        : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums text-slate-950">
                      {memberMoney(row.amount)}
                    </p>
                    <p
                      className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${row.status === "POSTED" ? "bg-emerald-100 text-emerald-900" : row.status === "REVERSED" ? "bg-rose-100 text-rose-900" : "bg-amber-100 text-amber-900"}`}
                    >
                      {row.status.toLowerCase()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <section className="flex flex-col gap-4 rounded-2xl border border-sky-200 bg-sky-50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="rounded-xl bg-sky-700 p-3 text-white">
            <LuCalendarDays className="h-5 w-5 shrink-0" />
          </span>
          <div>
            <h2 className="text-base font-bold text-[#102e26]">Next meeting</h2>
            {meetings.isPending ? (
              <p role="status" className="mt-1 text-sm text-slate-600">
                Loading the meeting calendar…
              </p>
            ) : meetings.isError ? (
              <p className="mt-1 text-sm text-slate-600">
                The meeting calendar could not be loaded.
              </p>
            ) : nextMeeting ? (
              <>
                <p className="mt-1 text-sm text-slate-700">
                  {memberDate(nextMeeting.meetingDate)} ·{" "}
                  {new Intl.DateTimeFormat("en-KE", {
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: "Africa/Nairobi",
                  }).format(new Date(nextMeeting.meetingDate))}
                </p>
                <p className="mt-1 break-words text-xs text-slate-600">
                  {nextMeeting.venue ||
                    (nextMeeting.virtualLink
                      ? "Online meeting"
                      : "Venue to be confirmed")}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-slate-600">
                No upcoming meeting is scheduled.
              </p>
            )}
          </div>
        </div>
        <Link
          to={
            nextMeeting
              ? `/member/meetings/${nextMeeting.id}`
              : "/member/meetings"
          }
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-sky-300 bg-white px-4 text-sm font-bold text-sky-900 transition hover:bg-sky-100"
        >
          {nextMeeting ? "Meeting details" : "Open calendar"}
          <LuArrowRight className="h-4 w-4" />
        </Link>
      </section>
      <p className="flex items-center justify-center gap-1.5 pb-2 text-center text-xs leading-5 text-slate-600">
        <LuLandmark className="h-3.5 w-3.5 shrink-0" />
        Your account information is visible only to you and authorised
        officials.
      </p>
    </div>
  );
}

export default MemberDashboardPage;
