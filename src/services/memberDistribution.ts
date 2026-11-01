import { api } from "./api";
export type DistributionYear = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
};
export type DistributionView = {
  enabled: true;
  status: "ESTIMATE" | "APPROVED";
  method: "CLOSING_CAPITAL";
  financialYear: DistributionYear;
  calculatedAt: string;
  member: {
    name: string;
    membershipNumber: string;
    shareCapital: number;
    savings: number;
    capital: number;
  };
  group: {
    capital: number;
    memberCount: number;
    shareablePool: number;
    breakdown: null | {
      interest: number;
      fines: number;
      otherIncome: number;
      income: number;
      expenses: number;
      adjustments: number;
    };
  };
  allocation: {
    percentage: number;
    currentShare: number;
    projectedShare: number;
    totalWithCapital: number;
  };
  assumptions: string[];
};
export type MemberDistribution =
  | { enabled: false }
  | {
      enabled: true;
      status: "UNAVAILABLE";
      financialYear: DistributionYear;
      message: string;
    }
  | DistributionView;
export type CapitalHistory = {
  page: number;
  pageSize: number;
  total: number;
  rows: Array<{
    reference: string;
    date: string;
    meeting: string | null;
    shareCapital: number;
    savings: number;
  }>;
};
export const memberDistributionApi = {
  view: async () =>
    (await api.get<MemberDistribution>("/member-portal/distribution")).data,
  history: async (page: number) =>
    (
      await api.get<CapitalHistory>("/member-portal/distribution/history", {
        params: { page },
      })
    ).data,
};
export const memberMoney = (amount: number) =>
  `KES ${Number(amount).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const memberDate = (date: string) =>
  new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  }).format(new Date(date));
