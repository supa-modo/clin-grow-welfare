import { useEffect, useState } from "react";
import { TbUser } from "react-icons/tb";
import { DependantsPanel } from "@/components/members/DependantsPanel";
import {
  DetailField,
  formatDate,
  membershipStatusBadgeTone,
  money,
  statusLabel,
} from "@/components/members/memberUi";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import DataTable from "@/components/ui/DataTable";
import { SearchBar } from "@/components/ui/SearchBar";
import SlideOver from "@/components/ui/SlideOver";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import ToggleSwitch from "@/components/ui/ToggleSwitch";
import { api } from "@/services/api";
import { loanApi } from "@/services/loanApi";
import type { LoanEligibility } from "@/types/loan";
import type { Member } from "@/types/member";

type DetailTab = "details" | "welfare" | "loans";

type WelfareSummary = {
  balances: {
    shareCapital: number;
    weeklySavings: number;
    welfareKitty: number;
    activeLoanBalance: number;
    finesBalance: number;
  };
  welfarePaidThisMonth: number;
};

type ContributionRow = {
  id: string;
  contributionType: string;
  amount: number;
  periodDate: string;
  receiptNumber?: string | null;
};

type LoanRow = {
  id: string;
  loanNumber?: string | null;
  status: string;
  requestedAmount: number;
  outstandingPrincipal?: number | null;
  totalOutstanding?: number | null;
  createdAt: string;
};

export type MemberDetailSlideOverProps = {
  open: boolean;
  member: Member | null;
  busy?: boolean;
  canUpdate?: boolean;
  canApprove?: boolean;
  onClose: () => void;
  onEdit: (member: Member) => void;
  onApprove: (member: Member) => void;
  onSuspend: (member: Member) => void;
  onActivate: (member: Member) => void;
  onExpel: (member: Member) => void;
  onToggleRegistration: (member: Member, paid: boolean) => void;
  onResetPassword?: (member: Member) => void;
};

export function MemberDetailSlideOver({
  open,
  member,
  busy,
  canUpdate,
  canApprove,
  onClose,
  onEdit,
  onApprove,
  onSuspend,
  onActivate,
  onExpel,
  onToggleRegistration,
  onResetPassword,
}: MemberDetailSlideOverProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("details");
  const [welfareSummary, setWelfareSummary] = useState<WelfareSummary | null>(null);
  const [contributions, setContributions] = useState<ContributionRow[]>([]);
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [loanEligibility, setLoanEligibility] = useState<LoanEligibility | null>(null);
  const [contribSearch, setContribSearch] = useState("");
  const [loadingTab, setLoadingTab] = useState(false);

  useEffect(() => {
    if (!open || !member?.id) return;
    if (activeTab !== "welfare" && activeTab !== "loans") return;
    let cancelled = false;
    setLoadingTab(true);
    void (async () => {
      try {
        if (activeTab === "welfare") {
          const [summaryRes, contribRes] = await Promise.all([
            api.get(`/members/${member.id}/welfare-summary`),
            api.get(`/members/${member.id}/contributions`, { params: { page: 1, pageSize: 25, search: contribSearch || undefined } }),
          ]);
          if (!cancelled) {
            setWelfareSummary(summaryRes.data.summary ?? null);
            setContributions(contribRes.data.data ?? []);
          }
        } else {
          const [loansRes, eligibility] = await Promise.all([
            api.get(`/members/${member.id}/loans`),
            loanApi.getEligibility(member.id).catch(() => null),
          ]);
          if (!cancelled) {
            setLoans(loansRes.data.loans ?? []);
            setLoanEligibility(eligibility);
          }
        }
      } finally {
        if (!cancelled) setLoadingTab(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab, contribSearch, member?.id, open]);

  if (!member) return null;

  const tabs = [
    { value: "details" as const, label: "Details" },
    { value: "welfare" as const, label: "Welfare account" },
    { value: "loans" as const, label: "Loans" },
  ];

  const terminal = ["WITHDRAWN", "EXPELLED", "DECEASED"].includes(member.status);

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={member.name}
      subtitle={
        member.email ?? member.phone ?? member.membershipNumber
      }
      widthClass="max-w-3xl"
      headerRight={
        canUpdate && !terminal ? (
          <Button variant="outline" size="sm" onClick={() => onEdit(member)}>
            Edit
          </Button>
        ) : null
      }
      footer={
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-xs font-medium text-gray-500">
            Status and payment changes require confirmation before saving.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            {canUpdate && !terminal ? (
              <Button variant="outline" size="sm" onClick={() => onEdit(member)}>
                Edit member
              </Button>
            ) : null}
            {canUpdate && onResetPassword ? (
              <Button variant="outline" size="sm" onClick={() => onResetPassword(member)} disabled={busy}>
                Reset password
              </Button>
            ) : null}
            {member.status === "PENDING" && canApprove ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onApprove(member)}
                disabled={busy}
              >
                Approve member
              </Button>
            ) : null}
            {canUpdate && member.status === "ACTIVE" ? (
              <Button
                variant="red"
                size="sm"
                onClick={() => onSuspend(member)}
                disabled={busy}
              >
                Suspend
              </Button>
            ) : null}
            {canUpdate && member.status === "SUSPENDED" ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onActivate(member)}
                disabled={busy}
              >
                Activate
              </Button>
            ) : null}
            {canUpdate &&
            !["PENDING", "EXPELLED", "WITHDRAWN", "DECEASED"].includes(
              member.status,
            ) ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExpel(member)}
                disabled={busy}
              >
                Expel
              </Button>
            ) : null}
          </div>
        </div>
      }
    >
      <div className="mb-5 rounded-2xl border border-secondary-600 bg-gray-50/60 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white text-gray-400">
              <TbUser className="h-10 w-10" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold leading-tight text-secondary-700">
                {member.name}
              </h3>
              <p className="mt-1 font-mono text-[0.78rem] text-gray-500">
                {member.membershipNumber}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone={membershipStatusBadgeTone[member.status]}>
                  {statusLabel(member.status)}
                </Badge>
                <Badge tone={member.registrationFeePaid ? "success" : "warning"}>
                  {member.registrationFeePaid ? "Reg. paid" : "Reg. pending"}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SegmentedTabs
        tabs={tabs}
        value={activeTab}
        onChange={(next) => setActiveTab(next as DetailTab)}
        className="mb-5"
      />

      {activeTab === "details" ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <DetailField label="Phone" value={member.phone} />
            <DetailField label="Email" value={member.email} />
            <DetailField label="ID / Passport" value={member.idNumber} />
            <DetailField label="Joined" value={formatDate(member.dateJoined)} />
            <DetailField label="Approved" value={formatDate(member.approvedAt)} />
            <DetailField label="Introduced by" value={member.introducedBy?.name} />
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Primary beneficiary</p>
            <p className="mt-2 text-base font-extrabold text-gray-900">{member.beneficiaryName || "-"}</p>
            <p className="mt-1 text-sm text-gray-500">{member.beneficiaryRelationship || "Relationship not set"}</p>
            <p className="mt-1 text-sm font-semibold text-gray-700">{member.beneficiaryPhone || "-"}</p>
          </div>
          <DependantsPanel memberId={member.id} scope="admin" canVerify={canUpdate} />
        </div>
      ) : null}

      {activeTab === "welfare" ? (
        <div className="space-y-4">
          {canUpdate ? (
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
              <span className="text-sm font-semibold text-gray-600">Registration paid</span>
              <ToggleSwitch
                checked={member.registrationFeePaid}
                onChange={() => onToggleRegistration(member, !member.registrationFeePaid)}
                variant="success"
                disabled={busy || member.registrationFeePaid}
              />
            </div>
          ) : null}
          {welfareSummary ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase text-gray-400">Share capital</p>
                <p className="mt-2 text-xl font-extrabold">{money(welfareSummary.balances.shareCapital)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase text-gray-400">Weekly savings</p>
                <p className="mt-2 text-xl font-extrabold">{money(welfareSummary.balances.weeklySavings)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase text-gray-400">Welfare kitty</p>
                <p className="mt-2 text-xl font-extrabold">{money(welfareSummary.balances.welfareKitty)}</p>
                <p className="mt-1 text-xs text-gray-500">Paid this month: {money(welfareSummary.welfarePaidThisMonth)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase text-gray-400">Outstanding fines</p>
                <p className="mt-2 text-xl font-extrabold">{money(welfareSummary.balances.finesBalance)}</p>
              </div>
            </div>
          ) : null}
          <SearchBar value={contribSearch} onChange={setContribSearch} placeholder="Search contributions" wrapperClassName="max-w-md" />
          <DataTable<ContributionRow>
            tableLoading={loadingTab}
            columns={[
              { header: 'Type', render: (row) => row.contributionType.replace(/_/g, ' ') },
              { header: 'Amount', render: (row) => money(Number(row.amount)) },
              { header: 'Period', render: (row) => formatDate(row.periodDate) },
              { header: 'Receipt', render: (row) => row.receiptNumber ?? '—' },
            ]}
            rows={contributions}
            getRowKey={(row) => row.id}
            showAutoNumber
            emptyTitle="No contributions"
            emptyMessage="Posted contributions will appear here."
          />
        </div>
      ) : null}

      {activeTab === "loans" ? (
        <div className="space-y-4">
          {loanEligibility ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase text-gray-400">Available loan limit</p>
                <p className="mt-2 text-xl font-extrabold text-primary-700">
                  {money(loanEligibility.maxEligible)}
                </p>
                <p className="mt-1 text-xs text-gray-500">{loanEligibility.note}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase text-gray-400">Total pending (active loans)</p>
                <p className="mt-2 text-xl font-extrabold text-red-700">
                  {money(
                    loans
                      .filter((row) =>
                        ['ACTIVE', 'PARTIALLY_PAID', 'IN_ROLLOVER', 'OVERDUE', 'DEFAULTED'].includes(row.status),
                      )
                      .reduce((sum, row) => sum + Number(row.totalOutstanding ?? row.outstandingPrincipal ?? 0), 0),
                  )}
                </p>
              </div>
            </div>
          ) : null}
          <DataTable<LoanRow>
            tableLoading={loadingTab}
            columns={[
              { header: 'Loan', render: (row) => row.loanNumber ?? row.id.slice(0, 8) },
              { header: 'Status', render: (row) => row.status.replace(/_/g, ' ') },
              { header: 'Requested', render: (row) => money(Number(row.requestedAmount)) },
              {
                header: 'Outstanding',
                render: (row) => money(Number(row.totalOutstanding ?? row.outstandingPrincipal ?? 0)),
              },
              { header: 'Opened', render: (row) => formatDate(row.createdAt) },
            ]}
            rows={loans}
            getRowKey={(row) => row.id}
            showAutoNumber
            emptyTitle="No loans"
            emptyMessage="Member loan history will appear here."
          />
        </div>
      ) : null}
    </SlideOver>
  );
}

export default MemberDetailSlideOver;
