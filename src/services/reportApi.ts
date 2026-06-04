import { api } from '@/services/api';
import type {
  ApprovalInboxItem,
  ExecutiveReport,
  FundBalanceRow,
  LoanAgingRow,
  MeetingCollectionsReport,
  PortalDashboardData,
} from '@/types/reports';

function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export const reportApi = {
  async executive(): Promise<ExecutiveReport> {
    const { data } = await api.get('/reports/executive');
    return unwrapData<ExecutiveReport>(data);
  },

  async fundBalances(): Promise<FundBalanceRow[]> {
    const { data } = await api.get('/reports/fund-balances');
    return unwrapData<FundBalanceRow[]>(data) ?? [];
  },

  async loanAging(): Promise<LoanAgingRow[]> {
    const { data } = await api.get('/reports/loan-aging');
    return unwrapData<LoanAgingRow[]>(data) ?? [];
  },

  async meetingCollections(): Promise<MeetingCollectionsReport> {
    const { data } = await api.get('/reports/meeting-collections');
    return unwrapData<MeetingCollectionsReport>(data);
  },

  async approvalsInbox(pageSize = 10): Promise<ApprovalInboxItem[]> {
    const { data } = await api.get('/approvals/inbox', {
      params: { page: 1, pageSize },
    });
    const rows = unwrapData<ApprovalInboxItem[]>(data);
    return Array.isArray(rows) ? rows : [];
  },

  async loadPortalDashboard(options: {
    canViewReports: boolean;
    canViewApprovals: boolean;
  }): Promise<PortalDashboardData> {
    const empty: PortalDashboardData = {
      executive: null,
      funds: [],
      aging: [],
      collections: null,
      approvals: [],
    };

    if (!options.canViewReports) {
      return empty;
    }

    const [executive, funds, aging, collections, approvals] =
      await Promise.allSettled([
        reportApi.executive(),
        reportApi.fundBalances(),
        reportApi.loanAging(),
        reportApi.meetingCollections(),
        options.canViewApprovals
          ? reportApi.approvalsInbox(10)
          : Promise.resolve([]),
      ]);

    return {
      executive: executive.status === 'fulfilled' ? executive.value : null,
      funds: funds.status === 'fulfilled' ? funds.value : [],
      aging: aging.status === 'fulfilled' ? aging.value : [],
      collections:
        collections.status === 'fulfilled' ? collections.value : null,
      approvals:
        approvals.status === 'fulfilled' ? approvals.value : [],
    };
  },
};
