import { useCallback, useEffect, useState } from "react";
import { FiDownload, FiRefreshCw, FiSave } from "react-icons/fi";
import { TbHeartbeat } from "react-icons/tb";
import { AdminPageLayout, AdminPageMain } from "@/layouts/AdminPageLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { NotificationModal } from "@/components/ui/NotificationModal";
import { Modal } from "@/components/ui/Modal";
import ToggleSwitch from "@/components/ui/ToggleSwitch";
import { useUiStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/auth";
import { ledgerApi } from "@/services/ledgerApi";
import { readBlobError } from "@/pages/admin/shared/adminFormatters";
import type { FinancialYear, WelfareSetting } from "@/types/ledger";
import { api } from "@/services/api";

type LoanIntegrityIssue = {
  code: string;
  severity: "ERROR" | "WARNING";
  category: string;
  loanNumber: string;
  memberName: string;
  message: string;
  expected?: string | number;
  actual?: string | number;
};
type LoanIntegrityResult = {
  generatedAt: string;
  checkedLoans: number;
  issueCount: number;
  errorCount: number;
  warningCount: number;
  healthy: boolean;
  issues: LoanIntegrityIssue[];
};

type VoucherSignatoryRole = NonNullable<WelfareSetting["voucherRequiredSignatoryRoles"]>[number];

const VOUCHER_ROLE_OPTIONS: Array<{ value: VoucherSignatoryRole; label: string }> = [
  { value: "CHAIRPERSON", label: "Chairperson" },
  { value: "TREASURER", label: "Treasurer" },
  { value: "SECRETARY", label: "Secretary" },
  { value: "NOMINATED_SIGNATORY", label: "Nominated Signatory" },
];

type SettingsForm = Partial<WelfareSetting> & {
  startDate?: string;
  endDate?: string;
  savingsStopDate?: string;
  agmDate?: string;
};

const groups: Array<{
  title: string;
  description: string;
  fields: Array<[keyof SettingsForm, string, string]>;
}> = [
  {
    title: "Communications",
    description: "Controls system-wide email delivery for operational notices and member messages.",
    fields: [
      ["emailNotificationsEnabled", "Master email notifications", "checkbox"],
    ],
  },
  {
    title: "Financial year",
    description: "Controls the open operating period and AGM/end-year dates.",
    fields: [
      ["startDate", "Start date", "date"],
      ["endDate", "End date", "date"],
      ["savingsStopDate", "Savings stop date", "date"],
      ["agmDate", "AGM / year close date", "date"],
    ],
  },
  {
    title: "Contributions",
    description: "Used by contribution posting, meeting collections, and member balances.",
    fields: [
      ["registrationFeeAmount", "Registration fee (KES)", "number"],
      ["minShareCapital", "Minimum share capital (KES)", "number"],
      ["maxShareCapital", "Maximum share capital (KES)", "number"],
      ["minWeeklySavings", "Minimum weekly savings (KES)", "number"],
      ["maxWeeklySavings", "Maximum weekly savings (KES)", "number"],
      ["monthlyWelfareContribution", "Monthly welfare kitty (KES)", "number"],
    ],
  },
  {
    title: "Meeting fines",
    description: "Used during attendance, fines generation, and meeting notification workflows.",
    fields: [
      ["lateFine", "Late attendance fine (KES)", "number"],
      ["monthlyAbsentFineWithApology", "Absent with apology fee (KES)", "number"],
      ["monthlyAbsentFineWithoutApology", "Absent without apology fine (KES)", "number"],
      ["meetingEmailRemindersEnabled", "Send meeting emails", "checkbox"],
    ],
  },
  {
    title: "Loans",
    description: "Used by loan eligibility, applications, interest, rollover, and penalties.",
    fields: [
      ["loanInterestRateMonthly", "Loan interest rate (% monthly)", "number"],
      ["loanMultiplierLimit", "Loan multiplier limit", "number"],
      ["loanStandardTermDays", "Standard term (days)", "number"],
      ["loanMaxRolloverMonths", "Max rollover months", "number"],
      ["latePenaltyRate", "Late/default penalty rate (%)", "number"],
      ["loanLatePenaltyFixed", "Fixed late penalty (KES)", "number"],
    ],
  },
];

function isoDate(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function apiError(error: unknown) {
  if (typeof error === "object" && error && "response" in error) {
    const response = (error as { response?: { data?: { message?: string; error?: string } } }).response;
    return response?.data?.message ?? response?.data?.error ?? "Failed to save settings.";
  }
  return "Failed to save settings.";
}

export function SystemSettingsPage() {
  const user = useAuthStore((s) => s.user);
  const toastSuccess = useUiStore((s) => s.toastSuccess);
  const toastError = useUiStore((s) => s.toastError);
  const [financialYear, setFinancialYear] = useState<FinancialYear | null>(null);
  const [form, setForm] = useState<SettingsForm>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [backupConfirmOpen, setBackupConfirmOpen] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [auditingLoans, setAuditingLoans] = useState(false);
  const [loanAudit, setLoanAudit] = useState<LoanIntegrityResult | null>(null);
  const canEdit = Boolean(user?.roles.some((role) => ["SystemAdmin", "Chairperson", "Secretary", "AssistantSecretary"].includes(role)));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { financialYear: fy } = await ledgerApi.getSystemSettings();
      setFinancialYear(fy);
      setForm({
        startDate: isoDate(fy.startDate),
        endDate: isoDate(fy.endDate),
        savingsStopDate: isoDate(fy.savingsStopDate),
        agmDate: isoDate(fy.agmDate),
        ...(fy.settings ?? {}),
      });
    } catch (error) {
      toastError(apiError(error));
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const setField = (field: keyof SettingsForm, value: string, type: string) => {
    setForm((current) => ({
      ...current,
      [field]: type === "number" ? Number(value) : type === "checkbox" ? value === "true" : value,
    }));
  };

  const toggleVoucherRole = (
    field: "voucherManagementApproverRoles" | "voucherRequiredSignatoryRoles",
    role: VoucherSignatoryRole,
  ) => {
    setForm((current) => {
      const existing = (current[field] ?? []) as VoucherSignatoryRole[];
      const next = existing.includes(role)
        ? existing.filter((entry) => entry !== role)
        : [...existing, role];
      return { ...current, [field]: next };
    });
  };

  const save = async () => {
    if (!financialYear || !canEdit) return;
    const mgmtRoles = form.voucherManagementApproverRoles ?? ["CHAIRPERSON"];
    const signRoles = form.voucherRequiredSignatoryRoles ?? ["TREASURER", "CHAIRPERSON"];
    if (!mgmtRoles.length || !signRoles.length) {
      toastError("Select at least one management approver and one required signatory.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form } as SettingsForm & { id?: string; financialYearId?: string };
      delete payload.id;
      delete payload.financialYearId;
      await ledgerApi.updateSystemSettings({
        ...payload,
        startDate: payload.startDate || undefined,
        endDate: payload.endDate || undefined,
        savingsStopDate: payload.savingsStopDate || undefined,
        agmDate: payload.agmDate || undefined,
      });
      setConfirmOpen(false);
      toastSuccess("System settings updated.");
      await load();
    } catch (error) {
      toastError(apiError(error));
    } finally {
      setSaving(false);
    }
  };

  const downloadBackup = async () => {
    setBackingUp(true);
    try {
      await ledgerApi.downloadDatabaseBackup();
      setBackupConfirmOpen(false);
      toastSuccess("Database backup downloaded.");
    } catch (error) {
      toastError(await readBlobError(error));
    } finally {
      setBackingUp(false);
    }
  };

  const runLoanIntegrityAudit = async () => {
    setAuditingLoans(true);
    try {
      const response = await api.post("/loans/integrity-audit");
      setLoanAudit(response.data.data);
    } catch (error) {
      toastError(apiError(error));
    } finally {
      setAuditingLoans(false);
    }
  };

  return (
    <AdminPageLayout className="pb-8">
      <PageHeader
        title="System settings"
        subtitle="Live welfare configuration used by contributions, meetings, fines, loans, and year-end workflows."
        action={<Button variant="secondary" icon={<FiRefreshCw />} onClick={() => void load()} disabled={loading}>Refresh</Button>}
      />
      <AdminPageMain>
        <div className="mb-4 rounded-lg border border-ink-100 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold text-ink-900">{financialYear?.name ?? "No active financial year"}</p>
              <p className="text-xs text-ink-500">
                {canEdit
                  ? "Changes apply immediately to new validations and workflow screens after refresh."
                  : "View-only access. Settings changes are handled by the chairperson or secretariat."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone={canEdit ? "success" : "neutral"}>{canEdit ? "Editable" : "View only"}</Badge>
              <Badge tone={financialYear?.status === "OPEN" ? "success" : "warning"}>{financialYear?.status ?? "Unavailable"}</Badge>
            </div>
          </div>
        </div>

        <section className="mb-4 rounded-lg border border-ink-100 bg-white p-4 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-extrabold text-ink-900">Payment vouchers</h2>
            <p className="mt-1 text-xs text-ink-500">
              Configure which officer roles must management-approve and sign disbursement vouchers. All selected signature roles must sign.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Management approvers</p>
              <div className="mt-2 grid gap-2">
                {VOUCHER_ROLE_OPTIONS.map((option) => (
                  <label key={`mgmt-${option.value}`} className="flex items-center gap-2 text-sm font-semibold text-ink-700">
                    <input
                      type="checkbox"
                      disabled={loading || !financialYear || !canEdit}
                      checked={(form.voucherManagementApproverRoles ?? ["CHAIRPERSON"]).includes(option.value)}
                      onChange={() => toggleVoucherRole("voucherManagementApproverRoles", option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Required signatories</p>
              <div className="mt-2 grid gap-2">
                {VOUCHER_ROLE_OPTIONS.map((option) => (
                  <label key={`sign-${option.value}`} className="flex items-center gap-2 text-sm font-semibold text-ink-700">
                    <input
                      type="checkbox"
                      disabled={loading || !financialYear || !canEdit}
                      checked={(form.voucherRequiredSignatoryRoles ?? ["TREASURER", "CHAIRPERSON"]).includes(option.value)}
                      onChange={() => toggleVoucherRole("voucherRequiredSignatoryRoles", option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        {canEdit ? (
          <section className="mb-4 rounded-lg border border-ink-100 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-extrabold text-ink-900">Database backup</h2>
                <p className="mt-1 text-xs text-ink-500">
                  Download a full PostgreSQL backup of the welfare database to this computer for disaster recovery.
                </p>
                <p className="mt-2 text-xs font-semibold text-amber-700">
                  The file contains sensitive member and financial data. Store it securely and do not share it casually.
                </p>
              </div>
              <Button
                variant="secondary"
                icon={<FiDownload />}
                disabled={loading || backingUp}
                isLoading={backingUp}
                onClick={() => setBackupConfirmOpen(true)}
              >
                Download database backup
              </Button>
            </div>
          </section>
        ) : null}

        <section className="mb-4 rounded-lg border border-ink-100 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-extrabold text-ink-900">Loan records integrity</h2>
              <p className="mt-1 max-w-3xl text-xs text-ink-500">
                Check every active loan for balance mismatches, repayment allocation errors, incorrect return dates, rollover gaps, stale statuses, and missing journal links.
              </p>
              <p className="mt-2 text-xs font-semibold text-brand-700">This is a read-only check and will not change loan records.</p>
            </div>
            <Button variant="secondary" icon={<TbHeartbeat />} isLoading={auditingLoans} disabled={loading || auditingLoans} onClick={() => void runLoanIntegrityAudit()}>
              Check active loans
            </Button>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-2">
          {groups.map((group) => (
            <section key={group.title} className="rounded-lg border border-ink-100 bg-white p-4 shadow-sm">
              <div className="mb-4">
                <h2 className="text-sm font-extrabold text-ink-900">{group.title}</h2>
                <p className="mt-1 text-xs text-ink-500">{group.description}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {group.fields.map(([field, label, type]) => {
                  if (type === "checkbox") {
                    return (
                      <div key={String(field)} className="flex items-center justify-between gap-3 rounded-lg border border-ink-100 bg-ink-50 px-3 py-2">
                        <span className="text-xs font-semibold text-ink-700">{label}</span>
                        <ToggleSwitch
                          checked={Boolean(form[field] ?? true)}
                          disabled={loading || !financialYear || !canEdit}
                          onChange={(checked) => setField(field, String(checked), type)}
                          variant={field === "emailNotificationsEnabled" ? "primary" : "success"}
                          title={label}
                        />
                      </div>
                    );
                  }
                  return (
                    <label key={String(field)} className="text-xs font-semibold text-ink-600">
                      {label}
                      <input
                        type={type}
                        value={(form[field] as string | number | undefined) ?? ""}
                        disabled={loading || !financialYear || !canEdit}
                        onChange={(event) => setField(field, event.target.value, type)}
                        className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-800 outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600 disabled:bg-ink-50"
                      />
                    </label>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {canEdit ? (
          <div className="sticky bottom-0 mt-4 flex justify-end border-t border-ink-100 bg-white/95 py-3">
            <Button icon={<FiSave />} onClick={() => setConfirmOpen(true)} disabled={!financialYear || saving}>
              Save settings
            </Button>
          </div>
        ) : null}
      </AdminPageMain>

      <NotificationModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Save system settings?"
        message="These values are used immediately by new contribution validation, meeting workflows, fines, loan calculations, and financial-year rules."
        confirmText="Save Settings"
        onConfirm={() => void save()}
      />

      <Modal
        open={Boolean(loanAudit)}
        title={loanAudit?.healthy ? "All active loans passed" : "Loan integrity issues found"}
        subtitle={loanAudit ? `${loanAudit.checkedLoans} active loan(s) checked · ${loanAudit.errorCount} errors · ${loanAudit.warningCount} warnings` : undefined}
        size="xl"
        onClose={() => setLoanAudit(null)}
        footer={<div className="flex justify-end"><Button onClick={() => setLoanAudit(null)}>Close</Button></div>}
      >
        {loanAudit?.healthy ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-sm font-semibold text-green-800">
            Balances, repayment allocations, dates, rollovers, statuses, and journal links are internally consistent as of this check.
          </div>
        ) : (
          <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
            {loanAudit?.issues.map((issue, index) => (
              <article key={`${issue.loanNumber}-${issue.code}-${index}`} className={`rounded-xl border p-4 ${issue.severity === "ERROR" ? "border-red-200 bg-red-50/70" : "border-amber-200 bg-amber-50/70"}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-extrabold text-ink-900">{issue.loanNumber} · {issue.memberName}</p>
                    <p className="mt-1 text-sm text-ink-700">{issue.message}</p>
                  </div>
                  <div className="flex gap-2"><Badge tone={issue.severity === "ERROR" ? "danger" : "warning"}>{issue.severity}</Badge><Badge tone="neutral">{issue.category}</Badge></div>
                </div>
                {issue.expected !== undefined || issue.actual !== undefined ? (
                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                    <div className="rounded-lg bg-white/80 px-3 py-2"><span className="font-bold text-ink-500">Expected:</span> <span className="font-semibold text-ink-800">{String(issue.expected ?? "—")}</span></div>
                    <div className="rounded-lg bg-white/80 px-3 py-2"><span className="font-bold text-ink-500">Recorded:</span> <span className="font-semibold text-ink-800">{String(issue.actual ?? "—")}</span></div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </Modal>

      <NotificationModal
        isOpen={backupConfirmOpen}
        onClose={() => !backingUp && setBackupConfirmOpen(false)}
        title="Download database backup?"
        message="This will create a compressed SQL dump of the full database and download it to this computer. The process may take a minute depending on database size."
        confirmText="Download backup"
        onConfirm={() => void downloadBackup()}
      />
    </AdminPageLayout>
  );
}
