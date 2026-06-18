import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { loanApi } from '@/services/loanApi';
import { useAuthStore } from '@/store/auth';
import { getApiError } from '@/pages/admin/shared/adminFormatters';

type LoanLike = {
  id: string;
  loanNumber?: string;
  status: string;
  memberAcknowledgedAt?: string;
  reviewedAt?: string;
  approvedAt?: string;
  chairpersonAuthorizedAt?: string;
};

function mapDisburseError(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const data = (error as { response?: { data?: { code?: string; error?: string } } }).response?.data;
    if (data?.code === 'LOAN_CHAIRPERSON_AUTHORIZATION_REQUIRED') {
      return 'Chairperson or Secretary must approve the loan before disbursement.';
    }
    if (data?.code === 'LOAN_TREASURER_VERIFICATION_REQUIRED') {
      return 'Treasurer must verify the loan before disbursement.';
    }
    if (data?.code === 'LOAN_MEMBER_ACKNOWLEDGEMENT_REQUIRED') {
      return 'Member must acknowledge the loan before disbursement.';
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
  const [status, setStatus] = useState<Awaited<ReturnType<typeof loanApi.getDisbursementStatus>> | null>(null);
  const [loading, setLoading] = useState(false);

  const canDisburse = permissions.includes('officialsPortal.loans.disburse');

  const load = async () => {
    if (!['PENDING_MEETING_APPROVAL', 'READY_FOR_DISBURSEMENT', 'AGREEMENT_PENDING'].includes(loan.status)) return;
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
  }, [loan.id, loan.status, loan.chairpersonAuthorizedAt, loan.reviewedAt, loan.memberAcknowledgedAt, loan.approvedAt]);

  const treasurerOk = status?.treasurerVerified ?? Boolean(loan.reviewedAt);
  const memberOk = status?.memberAcknowledged ?? Boolean(loan.memberAcknowledgedAt);
  const approvedOk = status?.managementApproved ?? Boolean(loan.approvedAt || loan.chairpersonAuthorizedAt);

  const disburseBlockedReason = !memberOk
    ? 'Member must acknowledge the loan.'
    : !treasurerOk
      ? 'Treasurer must verify the loan.'
      : !approvedOk
        ? 'Chairperson or Secretary approval is required before disbursement.'
        : null;

  if (!['PENDING_MEETING_APPROVAL', 'READY_FOR_DISBURSEMENT', 'AGREEMENT_PENDING'].includes(loan.status)) return null;

  return (
    <div className="mt-3 rounded-lg border border-ink-100 bg-ink-50 p-3 text-xs">
      <p className="font-bold text-ink-800">Disbursement readiness</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge tone={treasurerOk ? 'success' : 'warning'}>Treasurer verified</Badge>
        <Badge tone={memberOk ? 'success' : 'warning'}>Member ack</Badge>
        <Badge tone={approvedOk ? 'success' : 'warning'}>Approved</Badge>
      </div>
      {disburseBlockedReason ? (
        <p className="mt-2 font-semibold text-amber-800">{disburseBlockedReason}</p>
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
    </div>
  );
}

export { mapDisburseError };
