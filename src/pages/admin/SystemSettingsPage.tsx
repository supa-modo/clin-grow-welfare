import { useEffect, useState } from "react";
import { FiRefreshCw, FiSave } from "react-icons/fi";
import { AdminPageLayout, AdminPageMain } from "@/layouts/AdminPageLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { NotificationModal } from "@/components/ui/NotificationModal";
import ToggleSwitch from "@/components/ui/ToggleSwitch";
import { useUiStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/auth";
import { ledgerApi } from "@/services/ledgerApi";
import type { FinancialYear, WelfareSetting } from "@/types/ledger";

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
  const canEdit = Boolean(user?.roles.some((role) => ["SystemAdmin", "Chairperson", "Secretary", "AssistantSecretary"].includes(role)));

  const load = async () => {
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
  };

  useEffect(() => {
    void load();
  }, []);

  const setField = (field: keyof SettingsForm, value: string, type: string) => {
    setForm((current) => ({
      ...current,
      [field]: type === "number" ? Number(value) : type === "checkbox" ? value === "true" : value,
    }));
  };

  const save = async () => {
    if (!financialYear || !canEdit) return;
    setSaving(true);
    try {
      const {
        id,
        financialYearId,
        ...payload
      } = form as SettingsForm & { id?: string; financialYearId?: string };
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

  return (
    <AdminPageLayout className="min-h-0">
      <PageHeader
        title="System settings"
        subtitle="Live welfare configuration used by contributions, meetings, fines, loans, and year-end workflows."
        action={<Button variant="secondary" icon={<FiRefreshCw />} onClick={() => void load()} disabled={loading}>Refresh</Button>}
      />
      <AdminPageMain className="overflow-y-auto pb-6">
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
    </AdminPageLayout>
  );
}
