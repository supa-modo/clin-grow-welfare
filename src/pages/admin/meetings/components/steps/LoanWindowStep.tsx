import { useEffect, useState } from 'react';
import { FiDollarSign, FiPlay, FiRefreshCw, FiSend, FiXCircle } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import SearchableDropdown from '@/components/ui/SearchableDropdown';
import { api } from '@/services/api';
import { loanApi } from '@/services/loanApi';
import { LoanDisbursementPanel } from '@/components/loans/LoanDisbursementPanel';
import { useAuthStore } from '@/store/auth';
import { money, tone } from '@/pages/admin/shared/adminFormatters';
import type { LoanPool, MeetingRecord, MeetingRoster, LoanReservation } from '../../types';

type Props = {
  meeting: MeetingRecord;
  roster: MeetingRoster | null;
  pool: LoanPool | null;
  busy: string;
  activeLoanWindow?: MeetingRecord['loanWindows'] extends (infer W)[] ? W : never;
  reservationDraft: Record<string, string>;
  setReservationDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  showReserveModal: boolean;
  setShowReserveModal: (open: boolean) => void;
  reserveForm: { memberId: string; amount: string; purpose: string };
  setReserveForm: React.Dispatch<React.SetStateAction<{ memberId: string; amount: string; purpose: string }>>;
  onOpenWindow: () => void;
  onCloseWindow: (id: string) => void;
  onUpdateReservation: (r: LoanReservation) => void;
  onReleaseReservation: (r: LoanReservation) => void;
  onOfficialReserve: () => void;
  onRefreshPool: () => void;
  onLoanAction: (loan: NonNullable<LoanReservation['loan']>, label: string, runner: () => Promise<unknown>) => void;
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
  onUpdateReservation,
  onReleaseReservation,
  onOfficialReserve,
  onRefreshPool,
  onLoanAction,
}: Props) {
  const permissions = useAuthStore((s) => s.user?.permissions ?? []);
  const canDisburse = permissions.includes('officialsPortal.loans.disburse');
  const canApproveLoan = permissions.includes('officialsPortal.loans.approve');
  const canVerify = permissions.includes('officialsPortal.loans.disburse');
  const blocked = !!busy || meeting.status === 'CLOSED';
  const windowOpen = activeLoanWindow && (activeLoanWindow as { status: string }).status === 'OPEN';
  const reservations = (activeLoanWindow as { reservations?: LoanReservation[] } | undefined)?.reservations ?? [];
  const [eligibleOptions, setEligibleOptions] = useState<Array<{ value: string; label: string }>>([]);

  useEffect(() => {
    if (!showReserveModal || !roster?.members.length) return;
    let cancelled = false;
    void (async () => {
      const opts: Array<{ value: string; label: string }> = [];
      for (const row of roster.members) {
        try {
          const res = await api.get(`/loans/eligibility/${row.member.id}`);
          if (Number(res.data.maxEligible ?? 0) > 0) {
            opts.push({
              value: row.member.id,
              label: `${row.member.membershipNumber} - ${row.member.name} (max ${money(Number(res.data.maxEligible))})`,
            });
          }
        } catch {
          /* skip ineligible */
        }
      }
      if (!cancelled) setEligibleOptions(opts);
    })();
    return () => { cancelled = true; };
  }, [showReserveModal, roster]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-100 bg-ink-900 p-4 text-white">
        <div>
          <p className="text-sm font-bold">Meeting loan window</p>
          <p className="mt-1 text-sm text-white/70">Live pool (updates in real time when open): {money(pool?.remainingAmount ?? 0)} available of {money(pool?.totalLoanablePool ?? 0)}.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={<FiRefreshCw />} disabled={!!busy} onClick={onRefreshPool}>Refresh pool</Button>
          {!windowOpen ? (
            <Button variant="secondary" icon={<FiPlay />} disabled={blocked} isLoading={busy === 'loan-window/open'} loadingText="Opening..." onClick={onOpenWindow}>Open window</Button>
          ) : null}
          {windowOpen ? (
            <>
              <Button variant="secondary" icon={<FiSend />} disabled={blocked} onClick={() => setShowReserveModal(true)}>Official reserve</Button>
              <Button variant="secondary" icon={<FiXCircle />} disabled={!!busy} onClick={() => onCloseWindow((activeLoanWindow as { id: string }).id)}>Close window</Button>
            </>
          ) : null}
        </div>
      </div>
      <div className="grid gap-3">
        {reservations.map((reservation) => {
          const loan = reservation.loan;
          const draftAmount = reservationDraft[reservation.id] ?? String(reservation.amount ?? 0);
          const showApprove = loan && ['PENDING_MEETING_APPROVAL', 'UNDER_REVIEW'].includes(loan.status) && !loan.memberAcknowledgedAt;
          return (
            <Card key={reservation.id} className="p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-ink-900">{reservation.member?.name ?? reservation.memberId}</p>
                    <Badge tone={tone(reservation.status)}>{reservation.status}</Badge>
                    {loan ? <Badge tone={tone(loan.status)}>{loan.status}</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-ink-600">{loan?.loanNumber ?? 'Pending loan'} - requested {money(loan?.requestedAmount ?? reservation.amount)}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input className="w-36 rounded-lg border border-ink-200 px-3 py-2 text-sm" inputMode="numeric" value={draftAmount} onChange={(e) => setReservationDraft((s) => ({ ...s, [reservation.id]: e.target.value }))} />
                    <Button size="sm" variant="secondary" disabled={!!busy || reservation.status !== 'RESERVED'} onClick={() => onUpdateReservation(reservation)}>Edit amount</Button>
                    <Button size="sm" variant="danger" disabled={!!busy || reservation.status !== 'RESERVED'} onClick={() => onReleaseReservation(reservation)}>Release</Button>
                  </div>
                </div>
                {loan ? (
                  <div className="flex max-w-xl flex-wrap justify-end gap-2">
                    {loan.status === 'SUBMITTED' && canVerify ? <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => onLoanAction(loan, 'verification', () => loanApi.verify(loan.id))}>Verify</Button> : null}
                    {showApprove && canApproveLoan ? (
                      <Button size="sm" disabled={!!busy} onClick={() => onLoanAction(loan, 'approval', () => loanApi.approve(loan.id, Number(draftAmount || loan.requestedAmount)))}>Approve</Button>
                    ) : null}
                    {loan.status === 'AGREEMENT_PENDING' ? (
                      <>
                        <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => void loanApi.downloadAgreement(loan.id, `agreement-${loan.loanNumber}.pdf`)}>Agreement</Button>
                        {!loan.agreementGeneratedAt ? <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => onLoanAction(loan, 'agreement generation', () => loanApi.generateAgreement(loan.id))}>Generate</Button> : null}
                        {!loan.memberAcknowledgedAt && canVerify ? <Button size="sm" variant="secondary2" disabled={!!busy} onClick={() => onLoanAction(loan, 'member acknowledgement', () => loanApi.recordMemberAck(loan.id))}>Record member ack</Button> : null}
                        {loan.memberAcknowledgedAt && !loan.treasurerVerifiedAt && canVerify ? <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => onLoanAction(loan, 'treasurer verification', () => loanApi.verifyAgreement(loan.id))}>Treasurer verify</Button> : null}
                        {loan.treasurerVerifiedAt && !loan.chairpersonAuthorizedAt && canApproveLoan ? <Button size="sm" variant="secondary2" disabled={!!busy} onClick={() => onLoanAction(loan, 'chair authorization', () => loanApi.authorizeAgreement(loan.id))}>Chair authorize</Button> : null}
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
                  onDisburse={() => onLoanAction(loan, 'disbursement', () => loanApi.disburse(loan.id))}
                />
              ) : null}
            </Card>
          );
        })}
        {!reservations.length ? <Card className="p-4 text-sm font-semibold text-ink-500">No reservations yet. Open the window and use official reserve or member applications.</Card> : null}
      </div>
      <p className="text-xs text-ink-500">If disbursement fails, check <Link className="text-brand-700 underline" to="/dashboard/loans">loans / vouchers</Link> for payment-ready vouchers.</p>

      <Modal open={showReserveModal} title="Official loan reservation" subtitle="Reserve from the live meeting pool on behalf of an eligible member." onClose={() => setShowReserveModal(false)} footer={
        <div className="flex justify-end gap-2 px-5 py-3">
          <Button variant="secondary" onClick={() => setShowReserveModal(false)}>Cancel</Button>
          <Button isLoading={busy === 'official-reserve'} onClick={onOfficialReserve}>Reserve</Button>
        </div>
      }>
        <div className="space-y-3 p-5">
          <SearchableDropdown
            label="Member"
            options={eligibleOptions}
            value={reserveForm.memberId}
            onChange={(memberId) => setReserveForm((f) => ({ ...f, memberId }))}
            placeholder={eligibleOptions.length ? 'Select eligible member' : 'Loading eligibility…'}
          />
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink-700">Amount</label>
            <input className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" inputMode="numeric" value={reserveForm.amount} onChange={(e) => setReserveForm((f) => ({ ...f, amount: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink-700">Purpose</label>
            <input className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" value={reserveForm.purpose} onChange={(e) => setReserveForm((f) => ({ ...f, purpose: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
