import { useEffect, useState } from "react";
import { FiPlus, FiSettings, FiLock } from "react-icons/fi";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { StatCard } from "@/components/ui/Card";
import { Spinner, EmptyState } from "@/components/ui/Feedback";
import { Badge } from "@/components/ui/Badge";
import { NotificationModal } from "@/components/ui/NotificationModal";
import { FinancialYearStatusBadge } from "@/components/ledger/FinancialYearStatusBadge";
import { ledgerApi } from "@/services/ledgerApi";
import { useAuthStore } from "@/store/auth";
import { useUiStore } from "@/store/uiStore";
import type { FinancialYear, WelfareSetting } from "@/types/ledger";
import ToggleSwitch from "@/components/ui/ToggleSwitch";
import { FaSave } from "react-icons/fa";

function money(n: number) {
  return `KES ${Number(n).toLocaleString()}`;
}

function defaultFinancialYearForm(years: FinancialYear[] = []) {
  const latestStartYear = years.reduce((latest, financialYear) => {
    const year = new Date(financialYear.startDate).getFullYear();
    return Number.isFinite(year) ? Math.max(latest, year) : latest;
  }, 0);
  const year = latestStartYear ? latestStartYear + 1 : new Date().getFullYear();

  return {
    name: `FY-${year}`,
    startDate: `${year}-01-01`,
    endDate: `${year}-12-20`,
  };
}

export function FinancialYearsPage() {
  const user = useAuthStore((s) => s.user);
  const toastSuccess = useUiStore((s) => s.toastSuccess);
  const toastError = useUiStore((s) => s.toastError);
  const [years, setYears] = useState<FinancialYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showSettings, setShowSettings] = useState<FinancialYear | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(defaultFinancialYearForm());
  const [settingsForm, setSettingsForm] = useState<Partial<WelfareSetting>>({});
  const [confirm, setConfirm] = useState<
    | null
    | { kind: "create" }
    | { kind: "saveSettings" }
    | { kind: "close"; fy: FinancialYear }
  >(null);

  const permissions = user?.permissions ?? [];
  const canCreateYear = permissions.includes("financialYears.create");
  const canCloseYear = permissions.includes("financialYears.close");
  const canEditSettings = Boolean(
    user?.roles.some((role) =>
      [
        "SystemAdmin",
        "Chairperson",
        "Secretary",
        "AssistantSecretary",
      ].includes(role),
    ),
  );
  const settingsReadOnly =
    !canEditSettings ||
    showSettings?.status === "CLOSED" ||
    showSettings?.status === "AUDITED";

  const load = () => {
    setLoading(true);
    ledgerApi
      .listFinancialYears()
      .then(setYears)
      .catch(() => setError("Failed to load financial years"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openSettings = (fy: FinancialYear) => {
    setShowSettings(fy);
    if (fy.settings) {
      setSettingsForm({
        registrationFeeAmount: fy.settings.registrationFeeAmount,
        minShareCapital: fy.settings.minShareCapital,
        maxShareCapital: fy.settings.maxShareCapital,
        minWeeklySavings: fy.settings.minWeeklySavings,
        maxWeeklySavings: fy.settings.maxWeeklySavings,
        monthlyWelfareContribution: fy.settings.monthlyWelfareContribution,
        loanInterestRateMonthly: fy.settings.loanInterestRateMonthly,
        loanMultiplierLimit: fy.settings.loanMultiplierLimit,
        loanStandardTermDays: fy.settings.loanStandardTermDays,
        loanMaxRolloverMonths: fy.settings.loanMaxRolloverMonths,
        latePenaltyRate: fy.settings.latePenaltyRate,
        loanLatePenaltyFixed: fy.settings.loanLatePenaltyFixed,
        lateFine: fy.settings.lateFine,
        monthlyAbsentFineWithApology: fy.settings.monthlyAbsentFineWithApology,
        monthlyAbsentFineWithoutApology:
          fy.settings.monthlyAbsentFineWithoutApology,
        meetingEmailRemindersEnabled: fy.settings.meetingEmailRemindersEnabled,
      });
    }
  };

  const submitNew = async () => {
    setSaving(true);
    try {
      await ledgerApi.createFinancialYear({
        name: form.name,
        startDate: form.startDate,
        endDate: form.endDate,
      });
      setShowNew(false);
      setConfirm(null);
      setForm(defaultFinancialYearForm(years));
      toastSuccess("Financial year created.");
      load();
    } catch (e: any) {
      toastError(
        e.response?.data?.error ??
          e.response?.data?.message ??
          "Failed to create financial year",
      );
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    if (!showSettings || settingsReadOnly) return;
    setSaving(true);
    try {
      await ledgerApi.upsertWelfareSettings(showSettings.id, settingsForm);
      setConfirm(null);
      setShowSettings(null);
      toastSuccess("Financial year settings saved.");
      load();
    } catch (e: any) {
      toastError(
        e.response?.data?.error ??
          e.response?.data?.message ??
          "Failed to save settings",
      );
    } finally {
      setSaving(false);
    }
  };

  const closeFY = async (fy: FinancialYear) => {
    try {
      await ledgerApi.closeFinancialYear(fy.id);
      setConfirm(null);
      toastSuccess(`${fy.name} closed.`);
      load();
    } catch (e: any) {
      toastError(
        e.response?.data?.error ??
          e.response?.data?.message ??
          "Failed to close financial year",
      );
    }
  };

  const openYear = years.find((y) => y.status === "OPEN");
  const totalJournals = years.reduce(
    (s, y) => s + (y._count?.journalEntries ?? 0),
    0,
  );
  const totalContributions = years.reduce(
    (s, y) => s + (y._count?.contributions ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Years"
        subtitle="Manage financial years and welfare configuration settings"
        action={
          canCreateYear ? (
            <Button
              icon={<FiPlus />}
              onClick={() => {
                setForm(defaultFinancialYearForm(years));
                setShowNew(true);
              }}
            >
              New Financial Year
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Active Financial Year"
          value={openYear?.name ?? "None"}
          detail={openYear ? "Currently open" : "No open year"}
        />
        <StatCard
          label="Total Journal Entries"
          value={totalJournals.toLocaleString()}
        />
        <StatCard
          label="Total Contributions"
          value={totalContributions.toLocaleString()}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : error ? (
        <EmptyState title="Error" message={error} />
      ) : (
        <DataTable
          columns={[
            {
              key: "name",
              header: "Year",
              render: (fy) => (
                <span className="font-semibold text-ink-900">{fy.name}</span>
              ),
            },
            {
              key: "period",
              header: "Period",
              render: (fy) =>
                `${new Date(fy.startDate).toLocaleDateString()} – ${new Date(fy.endDate).toLocaleDateString()}`,
            },
            {
              key: "status",
              header: "Status",
              render: (fy) => <FinancialYearStatusBadge status={fy.status} />,
            },
            {
              key: "entries",
              header: "Journals",
              render: (fy) => fy._count?.journalEntries ?? 0,
            },
            {
              key: "contributions",
              header: "Contributions",
              render: (fy) => fy._count?.contributions ?? 0,
            },
            {
              key: "actions",
              header: "",
              render: (fy) => (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<FiSettings size={14} />}
                    onClick={() => openSettings(fy)}
                  >
                    {canEditSettings &&
                    !["CLOSED", "AUDITED"].includes(fy.status)
                      ? "Settings"
                      : "View"}
                  </Button>
                  {fy.status === "OPEN" && canCloseYear ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<FiLock size={14} />}
                      onClick={() => setConfirm({ kind: "close", fy })}
                      className="text-red-600 hover:bg-red-50"
                    >
                      Close Year
                    </Button>
                  ) : null}
                </div>
              ),
            },
          ]}
          rows={years}
          getRowKey={(fy) => fy.id}
        />
      )}

      {/* New FY Modal */}
      <Modal
        open={showNew}
        title="New Financial Year"
        onClose={() => setShowNew(false)}
        footer={
          <div className="flex justify-end gap-2 px-5 py-3">
            <Button variant="secondary" onClick={() => setShowNew(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => setConfirm({ kind: "create" })}
              isLoading={saving}
              loadingText="Creating..."
              disabled={!canCreateYear}
            >
              Create
            </Button>
          </div>
        }
      >
        <div className="space-y-4 p-5">
          <div>
            <label className="block text-sm font-semibold text-ink-700 mb-1">
              Year Name
            </label>
            <input
              className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. FY-2027"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-ink-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm"
                value={form.startDate}
                onChange={(e) =>
                  setForm({ ...form, startDate: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Settings Modal */}
      {showSettings && (
        <Modal
          open={!!showSettings}
          title={`Welfare Settings — ${showSettings.name}`}
          onClose={() => setShowSettings(null)}
          size="lg"
          footer={
            <div className="flex justify-end gap-2 px-5 py-3">
              <Button variant="secondary" onClick={() => setShowSettings(null)}>
                Cancel
              </Button>
              {!settingsReadOnly ? (
                <Button
                  onClick={() => setConfirm({ kind: "saveSettings" })}
                  icon={<FaSave className="w-4 h-4" />}
                  isLoading={saving}
                  loadingText="Saving..."
                >
                  Save Settings
                </Button>
              ) : null}
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <label className="col-span-2 flex items-center justify-between gap-3 rounded-lg border border-ink-100 bg-ink-50 px-3 py-2 text-xs font-semibold text-ink-700">
                <span>Send meeting schedule, notice, and reminder emails</span>
                <ToggleSwitch
                  checked={Boolean(
                    settingsForm.meetingEmailRemindersEnabled ?? true,
                  )}
                  onChange={(checked) =>
                    setSettingsForm({
                      ...settingsForm,
                      meetingEmailRemindersEnabled: checked,
                    })
                  }
                />
              </label>
              {[
                ["registrationFeeAmount", "Registration Fee (KES)"],
                ["minShareCapital", "Min Share Capital (KES)"],
                ["maxShareCapital", "Max Share Capital (KES)"],
                ["minWeeklySavings", "Min Weekly Savings (KES)"],
                ["maxWeeklySavings", "Max Weekly Savings (KES)"],
                ["monthlyWelfareContribution", "Monthly Welfare Kitty (KES)"],
                ["loanInterestRateMonthly", "Loan Interest Rate (% monthly)"],
                ["loanMultiplierLimit", "Loan Multiplier"],
                ["loanStandardTermDays", "Standard Loan Term (Days)"],
                ["loanMaxRolloverMonths", "Max Rollover Months"],
                ["latePenaltyRate", "Late Penalty Rate (%)"],
                ["loanLatePenaltyFixed", "Fixed Late Loan Penalty (KES)"],
                ["lateFine", "Meeting Lateness Fine (KES)"],
                [
                  "monthlyAbsentFineWithApology",
                  "Absent With Apology Fee (KES)",
                ],
                [
                  "monthlyAbsentFineWithoutApology",
                  "Absent Without Apology Fine (KES)",
                ],
              ].map(([field, label]) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-ink-600 mb-1">
                    {label}
                  </label>
                  <input
                    type="number"
                    disabled={settingsReadOnly}
                    className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm disabled:bg-ink-50"
                    value={
                      (settingsForm[field as keyof WelfareSetting] as
                        | string
                        | number
                        | undefined) ?? ""
                    }
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        [field]: Number(e.target.value),
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      <NotificationModal
        isOpen={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={
          confirm?.kind === "create"
            ? "Create financial year?"
            : confirm?.kind === "saveSettings"
              ? "Save financial year settings?"
              : "Close financial year?"
        }
        message={
          confirm?.kind === "create"
            ? "This will create a new financial year using the selected dates."
            : confirm?.kind === "saveSettings"
              ? "These settings are used by contribution validation, meeting workflows, fines, and loan calculations."
              : `This will close ${confirm?.kind === "close" ? confirm.fy.name : "the financial year"} and block new postings.`
        }
        confirmText={
          confirm?.kind === "create"
            ? "Create"
            : confirm?.kind === "saveSettings"
              ? "Save Settings"
              : "Close Year"
        }
        type={confirm?.kind === "close" ? "delete" : "confirm"}
        onConfirm={() => {
          if (confirm?.kind === "create") void submitNew();
          if (confirm?.kind === "saveSettings") void saveSettings();
          if (confirm?.kind === "close") void closeFY(confirm.fy);
        }}
      />
    </div>
  );
}
