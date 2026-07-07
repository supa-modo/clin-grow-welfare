import { useEffect, useState } from "react";
import {
  FiDollarSign,
  FiPlay,
  FiRefreshCw,
  FiSend,
  FiXCircle,
} from "react-icons/fi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import SearchableDropdown from "@/components/ui/SearchableDropdown";
import { loanApi } from "@/services/loanApi";
import { LoanDisbursementPanel } from "@/components/loans/LoanDisbursementPanel";
import { useAuthStore } from "@/store/auth";
import { isSystemAdmin } from "@/lib/workspaces";
import { money, tone } from "@/pages/admin/shared/adminFormatters";
import { isCollectionsFinalized } from "../../utils";
import type {
  LoanPool,
  MeetingRecord,
  MeetingRoster,
  LoanReservation,
} from "../../types";
import Input from "@/components/ui/Input";

type Props = {
  meeting: MeetingRecord;
  roster: MeetingRoster | null;
  pool: LoanPool | null;
  busy: string;
  activeLoanWindow?: MeetingRecord["loanWindows"] extends (infer W)[]
    ? W
    : never;
  reservationDraft: Record<string, string>;
  setReservationDraft: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  showReserveModal: boolean;
  setShowReserveModal: (open: boolean) => void;
  reserveForm: { memberId: string; amount: string; purpose: string };
  setReserveForm: React.Dispatch<
    React.SetStateAction<{ memberId: string; amount: string; purpose: string }>
  >;
  onOpenWindow: () => void;
  onCloseWindow: (id: string, options?: { carryOverRemaining?: boolean; skipConfirm?: boolean }) => void;
  onReopenWindow?: (id: string) => void;
  onUpdateReservation: (r: LoanReservation) => void;
  onReleaseReservation: (r: LoanReservation) => void;
  onOfficialReserve: () => void;
  onRefreshPool: () => void;
  unclaimedCarryover?: number;
  onLoanAction: (
    loan: NonNullable<LoanReservation["loan"]>,
    label: string,
    runner: () => Promise<unknown>,
  ) => void;
  aobDraft: string;
  onAobChange: (value: string) => void;
  onSaveAob: () => void;
};

export function LoanWindowStep({
  meeting,
  roster,
  pool,
  busy,
  activeLoanWindow,
  reservationDraft,
  setReservationDraft,
  showReserveModal,
  setShowReserveModal,
  reserveForm,
  setReserveForm,
  onOpenWindow,
  onCloseWindow,
  onReopenWindow,
  onUpdateReservation,
  onReleaseReservation,
  onOfficialReserve,
  onRefreshPool,
  unclaimedCarryover = 0,
  onLoanAction,
  aobDraft,
  onAobChange,
  onSaveAob,
}: Props) {
  const user = useAuthStore((s) => s.user);
  const permissions = user?.permissions ?? [];
  const canDisburse = permissions.includes("officialsPortal.loans.disburse");
  const canApproveLoan = permissions.includes("officialsPortal.loans.approve");
  const canVerify = permissions.includes("officialsPortal.loans.disburse");
  const canAdminOverride =
    isSystemAdmin(user) ||
    permissions.includes("officialsPortal.meetings.adminOverride");
  const blocked = !!busy || meeting.status === "CLOSED";
  const windowOpen =
    activeLoanWindow &&
    (activeLoanWindow as { status: string }).status === "OPEN";
  const reservations =
    (activeLoanWindow as { reservations?: LoanReservation[] } | undefined)
      ?.reservations ?? [];
  const [eligibleOptions, setEligibleOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [eligibilityLoaded, setEligibilityLoaded] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [carryOverOnClose, setCarryOverOnClose] = useState(false);
  const collectionsFinalized = isCollectionsFinalized(meeting);

  useEffect(() => {
    if (!showReserveModal || !roster?.members.length) {
      setEligibleOptions([]);
      setEligibilityLoading(false);
      setEligibilityLoaded(false);
      return;
    }
    let cancelled = false;
    setEligibilityLoading(true);
    setEligibilityLoaded(false);
    setEligibleOptions([]);
    window.setTimeout(() => {
      if (cancelled) return;
      const multiplier = roster.settings.loanMultiplierLimit ?? 3;
      const opts = roster.members
        .map((row) => {
          const base = row.expectations.shareCapital.paidToDate + (row.expectations.weeklySavings.paidToDate ?? 0);
          return { row, maxEligible: base * multiplier, hasActiveLoan: row.expectations.loans.active.length > 0 };
        })
        .filter(({ hasActiveLoan, maxEligible }) => !hasActiveLoan && maxEligible > 0)
        .map(({ row, maxEligible }) => ({
          value: row.member.id,
          label: `${row.member.membershipNumber} - ${row.member.name} (max ${money(maxEligible)})`,
        }));
      setEligibleOptions(opts);
      setEligibilityLoading(false);
      setEligibilityLoaded(true);
    }, 0);
    return () => {
      cancelled = true;
    };
  }, [showReserveModal, roster]);

  const windowClosed =
    activeLoanWindow &&
    (activeLoanWindow as { status: string }).status === "CLOSED";

  const pipelineLabels = ["Reserved", "Verified", "Member ack", "Approved", "Disbursed"];
  const pipelineIndex = (status: string) => {
    if (status === "SUBMITTED") return 0;
    if (["PENDING_MEETING_APPROVAL", "UNDER_REVIEW"].includes(status)) return 1;
    if (status === "READY_FOR_DISBURSEMENT") return 3;
    if (["ACTIVE", "PARTIALLY_PAID", "IN_ROLLOVER", "OVERDUE"].includes(status)) return 4;
    if (status === "AGREEMENT_PENDING") return 2;
    return -1;
  };

  const memberPlaceholder = eligibilityLoading
    ? "Loading eligibility…"
    : eligibilityLoaded && eligibleOptions.length === 0
      ? "No eligible members for this meeting"
      : "Select eligible member";

  const poolSummary = (() => {
    const total = pool?.totalLoanablePool ?? 0;
    const reserved = pool?.reservedAmount ?? 0;
    const disbursed = pool?.committedAmount ?? 0;
    const available = pool?.remainingAmount ?? 0;
    const carried = pool?.carriedForwardAmount ?? 0;
    const carriedNote = carried > 0 ? ` (incl. ${money(carried)} carried from previous meeting)` : '';
    if (windowClosed) {
      return `${money(available)} available of ${money(total)} collected${carriedNote} · ${money(disbursed)} disbursed · ${money(reserved)} reserved`;
    }
    return `${money(available)} available of ${money(total)}${carriedNote} · ${money(disbursed)} disbursed · ${money(reserved)} reserved`;
  })();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-100 bg-ink-900 p-4 text-white">
        <div>
          <p className="text-sm font-bold">Meeting loan window</p>
          <p className="mt-1 text-sm text-white/70">
            {windowOpen ? "Live pool: " : windowClosed ? "Final pool: " : "Pool: "}
            {poolSummary}. Pool = share capital + savings + repayments + fines
            collected this meeting (welfare excluded).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
          size="sm"
            variant="secondary"
            icon={<FiRefreshCw />}
            disabled={!!busy}
            onClick={onRefreshPool}
          >
            Refresh pool
          </Button>
          {!windowOpen && !windowClosed ? (
            <Button
            size="sm"
              variant="secondary"
              icon={<FiPlay />}
              disabled={blocked || !collectionsFinalized}
              isLoading={busy === "loan-window/open"}
              loadingText="Opening..."
              onClick={onOpenWindow}
            >
              Open window
            </Button>
          ) : null}
          {windowClosed && canAdminOverride && onReopenWindow ? (
            <Button
              size="sm"
              variant="secondary"
              icon={<FiPlay />}
              disabled={blocked}
              onClick={() => onReopenWindow((activeLoanWindow as { id: string }).id)}
            >
              Reopen window
            </Button>
          ) : null}
          {windowOpen ? (
            <>
              <Button
              size="sm"
                variant="secondary"
                icon={<FiSend />}
                disabled={blocked}
                onClick={() => setShowReserveModal(true)}
              >
                Official reserve
              </Button>
              <Button
              size="sm"
                variant="secondary"
                icon={<FiXCircle />}
                disabled={!!busy}
                onClick={() => {
                  setCarryOverOnClose((pool?.remainingAmount ?? 0) > 0);
                  setShowCloseModal(true);
                }}
              >
                Close window
              </Button>
            </>
          ) : null}
        </div>
      </div>
      {!collectionsFinalized ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          Finalize collections on the Collections step before opening the loan window.
        </p>
      ) : null}
      {unclaimedCarryover > 0.01 && !windowOpen ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="font-semibold">{money(unclaimedCarryover)} carried forward</span> from a previous meeting is available.
          Open the loan window to include it in the pool.
        </p>
      ) : null}
      <div className="grid gap-3">
        {reservations.map((reservation) => {
          const loan = reservation.loan;
          const draftAmount =
            reservationDraft[reservation.id] ?? String(reservation.amount ?? 0);
          const showApprove =
            loan &&
            ["PENDING_MEETING_APPROVAL", "UNDER_REVIEW"].includes(
              loan.status,
            ) &&
            !!loan.memberAcknowledgedAt;
          const showMemberAck =
            loan &&
            ["PENDING_MEETING_APPROVAL", "UNDER_REVIEW"].includes(loan.status) &&
            !loan.memberAcknowledgedAt;
          return (
            <Card key={reservation.id} className="p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-ink-900">
                      {reservation.member?.name ?? reservation.memberId}
                    </p>
                    <Badge tone={tone(reservation.status)}>
                      {reservation.status}
                    </Badge>
                    {loan ? (
                      <Badge tone={tone(loan.status)}>{loan.status}</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-ink-600">
                    {loan?.loanNumber ?? "Pending loan"} - requested{" "}
                    {money(loan?.requestedAmount ?? reservation.amount)}
                  </p>
                  {loan && pipelineIndex(loan.status) >= 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {pipelineLabels.map((label, index) => {
                        const current = pipelineIndex(loan.status);
                        const done = index < current;
                        const active = index === current;
                        return (
                          <Badge
                            key={label}
                            tone={done ? "success" : active ? "warning" : "neutral"}
                          >
                            {label}
                          </Badge>
                        );
                      })}
                    </div>
                  ) : null}
                  {loan?.status === "SUBMITTED" ? (
                    <p className="mt-2 text-xs font-semibold text-amber-800">
                      Treasurer verification required before member acknowledgement.
                    </p>
                  ) : null}
                  {showMemberAck && !loan?.memberAcknowledgedAt && loan?.reviewedAt ? (
                    <p className="mt-2 text-xs font-semibold text-amber-800">
                      Record member acknowledgement, then Chair or Secretary can approve.
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      className="w-36 rounded-lg border border-ink-200 px-3 py-2 text-sm"
                      inputMode="numeric"
                      value={draftAmount}
                      onChange={(e) =>
                        setReservationDraft((s) => ({
                          ...s,
                          [reservation.id]: e.target.value,
                        }))
                      }
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!!busy || reservation.status !== "RESERVED"}
                      onClick={() => onUpdateReservation(reservation)}
                    >
                      Edit amount
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={!!busy || reservation.status !== "RESERVED"}
                      onClick={() => onReleaseReservation(reservation)}
                    >
                      Release
                    </Button>
                  </div>
                </div>
                {loan ? (
                  <div className="flex max-w-xl flex-wrap justify-end gap-2">
                    {loan.status === "SUBMITTED" && canVerify ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!!busy}
                        onClick={() =>
                          onLoanAction(loan, "verification", () =>
                            loanApi.verify(loan.id),
                          )
                        }
                      >
                        Verify
                      </Button>
                    ) : null}
                    {showMemberAck && canVerify ? (
                      <Button
                        size="sm"
                        variant="secondary2"
                        disabled={!!busy || !loan.reviewedAt}
                        onClick={() =>
                          onLoanAction(loan, "member acknowledgement", () =>
                            loanApi.recordMemberAck(loan.id),
                          )
                        }
                      >
                        Record member ack
                      </Button>
                    ) : null}
                    {showApprove && canApproveLoan ? (
                      <Button
                        size="sm"
                        disabled={!!busy}
                        onClick={() =>
                          onLoanAction(loan, "approval", () =>
                            loanApi.approve(
                              loan.id,
                              Number(draftAmount || loan.requestedAmount),
                            ),
                          )
                        }
                      >
                        Approve
                      </Button>
                    ) : null}
                    {loan.status === "READY_FOR_DISBURSEMENT" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!!busy}
                        onClick={() =>
                          void loanApi.downloadAgreement(
                            loan.id,
                            `agreement-${loan.loanNumber}.pdf`,
                          )
                        }
                      >
                        Agreement
                      </Button>
                    ) : null}
                    {loan.status === "AGREEMENT_PENDING" ? (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={!!busy}
                          onClick={() =>
                            void loanApi.downloadAgreement(
                              loan.id,
                              `agreement-${loan.loanNumber}.pdf`,
                            )
                          }
                        >
                          Agreement
                        </Button>
                        {!loan.memberAcknowledgedAt && canVerify ? (
                          <Button
                            size="sm"
                            variant="secondary2"
                            disabled={!!busy}
                            onClick={() =>
                              onLoanAction(loan, "member acknowledgement", () =>
                                loanApi.recordMemberAck(loan.id),
                              )
                            }
                          >
                            Record member ack
                          </Button>
                        ) : null}
                        {loan.memberAcknowledgedAt &&
                        !loan.chairpersonAuthorizedAt &&
                        canApproveLoan ? (
                          <Button
                            size="sm"
                            variant="secondary2"
                            disabled={!!busy}
                            onClick={() =>
                              onLoanAction(loan, "chair authorization", () =>
                                loanApi.authorizeAgreement(loan.id),
                              )
                            }
                          >
                            Chair authorize
                          </Button>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {loan ? (
                <LoanDisbursementPanel
                  loan={loan}
                  busy={!!busy}
                  onRefresh={onRefreshPool}
                  onDisburse={() =>
                    onLoanAction(loan, "disbursement", () =>
                      loanApi.disburse(loan.id),
                    )
                  }
                />
              ) : null}
            </Card>
          );
        })}
        {!reservations.length ? (
          <Card className="p-4 text-sm font-semibold text-ink-500">
            No reservations yet. Open the window and use official reserve or
            member applications.
          </Card>
        ) : null}
      </div>
      <p className="text-xs text-ink-500">
        Disbursement requires treasurer verification, member acknowledgement, and chair or secretary approval.
      </p>

      {meeting.loanStageReachedAt ? (
        <div className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-ink-900">Any other business (AOB)</h3>
          <p className="mt-1 text-sm text-ink-600">
            Record any other business raised after loan disbursements before closing the meeting.
          </p>
          <textarea
            className="mt-3 min-h-[120px] w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
            value={aobDraft}
            onChange={(e) => onAobChange(e.target.value)}
            placeholder="Type any other business for this sitting..."
            disabled={!!busy || meeting.status === "CLOSED"}
          />
          <div className="mt-3 flex justify-end">
            <Button
              size="sm"
              variant="secondary2"
              disabled={!!busy || meeting.status === "CLOSED"}
              isLoading={busy === "aob"}
              onClick={onSaveAob}
            >
              Save AOB
            </Button>
          </div>
        </div>
      ) : null}

      <Modal
        open={showReserveModal}
        title="Official loan reservation"
        subtitle="Reserve from the live meeting pool on behalf of an eligible member."
        onClose={() => setShowReserveModal(false)}
        footer={
          <div className="flex justify-end gap-2 px-5 py-3">
            <Button
              variant="secondary"
              onClick={() => setShowReserveModal(false)}
            >
              Cancel
            </Button>
            <Button
              isLoading={busy === "official-reserve"}
              onClick={onOfficialReserve}
            >
              Reserve
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <SearchableDropdown
            label="Member"
            options={eligibleOptions}
            value={reserveForm.memberId}
            onChange={(memberId) => setReserveForm((f) => ({ ...f, memberId }))}
            placeholder={memberPlaceholder}
            disabled={eligibilityLoading}
          />
          <Input
            label="Amount"
            placeholder="Loan Amount (e.g. 100000)."
            value={reserveForm.amount}
            onChange={(e) =>
              setReserveForm((f) => ({ ...f, amount: e.target.value }))
            }
          />
          <Input
            label="Purpose"
            placeholder="Enter purpose of the loan"
            value={reserveForm.purpose}
            onChange={(e) =>
              setReserveForm((f) => ({ ...f, purpose: e.target.value }))
            }
          />
          
        </div>
      </Modal>

      <Modal
        open={showCloseModal}
        title="Close loan window?"
        subtitle="No new loan reservations can be made after closing."
        onClose={() => setShowCloseModal(false)}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-600">
            Remaining pool: <span className="font-bold text-ink-900">{money(pool?.remainingAmount ?? 0)}</span>
          </p>
          {(pool?.remainingAmount ?? 0) > 0 ? (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-100 bg-ink-50 p-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={carryOverOnClose}
                onChange={(e) => setCarryOverOnClose(e.target.checked)}
              />
              <span>
                <span className="font-semibold text-ink-900">Carry remaining to next meeting</span>
                <span className="mt-0.5 block text-ink-500">
                  Adds {money(pool?.remainingAmount ?? 0)} to the next meeting&apos;s loanable pool when its window opens.
                </span>
              </span>
            </label>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setShowCloseModal(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="secondary2"
              disabled={!!busy}
              onClick={() => {
                setShowCloseModal(false);
                onCloseWindow((activeLoanWindow as { id: string }).id, {
                  carryOverRemaining: carryOverOnClose,
                  skipConfirm: true,
                });
              }}
            >
              Close window
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
