import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { loanApi } from '@/services/loanApi';
import { voucherApi } from '@/services/voucherApi';
import { useAuthStore } from '@/store/auth';
import { getApiError } from '@/pages/admin/shared/adminFormatters';
import { useUiStore } from '@/store/uiStore';

type LoanLike = {
  id: string;
  loanNumber?: string;
  status: string;
  memberAcknowledgedAt?: string;
  treasurerVerifiedAt?: string;
  chairpersonAuthorizedAt?: string;
};

function mapDisburseError(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const data = (error as { response?: { data?: { code?: string; error?: string } } }).response?.data;
    if (data?.code === 'LOAN_CHAIRPERSON_AUTHORIZATION_REQUIRED') {
      return 'Chairperson must authorize the loan agreement before disbursement.';
    }
    if (data?.code === 'VOUCHER_CHAIRPERSON_SIGNATURE_REQUIRED') {
      return 'Chairperson or Nominated Signatory must sign the payment voucher before disbursement.';
    }
    if (data?.code === 'VOUCHER_TREASURER_SIGNATURE_REQUIRED') {
      return 'Treasurer must sign the payment voucher before disbursement.';
    }
    if (data?.code === 'VOUCHER_NOT_PAYMENT_READY') {
      return data.error ?? 'Payment voucher is not ready. Complete management approval and dual signatures first.';
    }
    return data?.error ?? getApiError(error);
  }
  return getApiError(error);
}

export function LoanDisbursementPanel({
  loan,
  busy,
  onRefresh,
  onDisburse,
}: {
  loan: LoanLike;
  busy: boolean;
  onRefresh: () => void;
  onDisburse: () => void;
}) {
  const permissions = useAuthStore((s) => s.user?.permissions ?? []);
  const toastError = useUiStore((s) => s.toastError);
  const toastSuccess = useUiStore((s) => s.toastSuccess);
  const [status, setStatus] = useState<Awaited<ReturnType<typeof loanApi.getDisbursementStatus>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [voucherBusy, setVoucherBusy] = useState('');

  const canApprove = permissions.includes('officialsPortal.vouchers.approve');
  const canSign = permissions.includes('officialsPortal.vouchers.sign');
  const canDisburse = permissions.includes('officialsPortal.loans.disburse');
  const canAuthorize = permissions.includes('officialsPortal.loans.approve');

  const load = async () => {
    if (!['AGREEMENT_PENDING', 'READY_FOR_DISBURSEMENT'].includes(loan.status)) return;
    setLoading(true);
    try {
      setStatus(await loanApi.getDisbursementStatus(loan.id));
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [loan.id, loan.status, loan.chairpersonAuthorizedAt, loan.treasurerVerifiedAt, loan.memberAcknowledgedAt]);

  const runVoucher = async (label: string, runner: () => Promise<unknown>) => {
    setVoucherBusy(label);
    try {
      await runner();
      await load();
      onRefresh();
      toastSuccess('Voucher updated', label);
    } catch (error) {
      toastError('Voucher action failed', mapDisburseError(error));
    } finally {
      setVoucherBusy('');
    }
  };

  const missingRoleLabels = (status?.voucher?.readiness?.missingRoles as string[] | undefined)?.map((role) =>
    role.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()),
  ) ?? [];

  const disburseBlockedReason = !loan.memberAcknowledgedAt
    ? 'Member must acknowledge the agreement.'
    : !loan.treasurerVerifiedAt
      ? 'Treasurer must verify the agreement.'
      : !loan.chairpersonAuthorizedAt
        ? 'Chairperson approval is required before disbursement.'
        : status?.voucher && !status.voucher.readiness?.ready
          ? !status.voucher.readiness.management
            ? 'Voucher needs management approval.'
            : missingRoleLabels.length
              ? `Missing voucher signature(s): ${missingRoleLabels.join(', ')}.`
              : 'Voucher is not payment-ready.'
          : null;

  if (!['AGREEMENT_PENDING', 'READY_FOR_DISBURSEMENT'].includes(loan.status)) return null;

  return (
    <div className="mt-3 rounded-lg border border-ink-100 bg-ink-50 p-3 text-xs">
      <p className="font-bold text-ink-800">Disbursement readiness</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge tone={loan.memberAcknowledgedAt ? 'success' : 'warning'}>Member ack</Badge>
        <Badge tone={loan.treasurerVerifiedAt ? 'success' : 'warning'}>Treasurer verify</Badge>
        <Badge tone={loan.chairpersonAuthorizedAt ? 'success' : 'warning'}>Chair authorize</Badge>
        {status?.voucher ? (
          <Badge tone={status.voucher.readiness?.ready ? 'success' : 'warning'}>Voucher {status.voucher.status}</Badge>
        ) : (
          <Badge tone="neutral">Voucher pending</Badge>
        )}
      </div>
      {disburseBlockedReason ? (
        <p className="mt-2 font-semibold text-amber-800">{disburseBlockedReason}</p>
      ) : null}
      {status?.voucher && !status.voucher.readiness?.ready ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {canApprove && !status.voucher.readiness?.management ? (
            <Button size="sm" variant="secondary" disabled={!!voucherBusy || busy} isLoading={voucherBusy === 'approve'} onClick={() => void runVoucher('Management approved', () => voucherApi.approve(status.voucher!.id))}>
              Approve voucher
            </Button>
          ) : null}
          {canSign && status.voucher.readiness?.management && (status.voucher.readiness.missingRoles?.length ?? 0) > 0 ? (
            <Button size="sm" variant="secondary2" disabled={!!voucherBusy || busy} isLoading={voucherBusy === 'sign'} onClick={() => void runVoucher('Signed', () => voucherApi.sign(status.voucher!.id))}>
              Sign voucher
            </Button>
          ) : null}
        </div>
      ) : null}
      {loan.status === 'READY_FOR_DISBURSEMENT' && canDisburse ? (
        <div className="mt-2">
          <Button
            size="sm"
            disabled={!!busy || !!disburseBlockedReason || loading}
            onClick={onDisburse}
          >
            Disburse
          </Button>
        </div>
      ) : null}
      {loan.treasurerVerifiedAt && !loan.chairpersonAuthorizedAt && canAuthorize ? (
        <p className="mt-2 text-ink-600">Use Chair authorize above to create the disbursement voucher and notify signatories.</p>
      ) : null}
    </div>
  );
}

export { mapDisburseError };
