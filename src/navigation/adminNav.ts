import type { ElementType } from "react";
import {
  TbChartBar,
  TbCoin,
  TbFileText,
  TbHeartHandshake,
  TbLayoutDashboard,
  TbReportMoney,
  TbUsers,
} from "react-icons/tb";
import { FiCheckCircle, FiCreditCard } from "react-icons/fi";

export type NavItemDef = {
  path: string;
  label: string;
  icon: ElementType;
  permission?: string;
};

export type NavGroupDef = {
  id: string;
  label: string;
  items: NavItemDef[];
};

export const adminNavGroups: NavGroupDef[] = [
  {
    id: "core",
    label: "Core",
    items: [
      { path: "/dashboard", label: "Dashboard", icon: TbLayoutDashboard },
      {
        path: "/dashboard/members",
        label: "Members",
        icon: TbUsers,
        permission: "officialsPortal.members.view",
      },
    ],
  },
  {
    id: "finance",
    label: "Finance & ledger",
    items: [
      {
        path: "/dashboard/ledger/financial-years",
        label: "Financial Years",
        icon: TbChartBar,
        permission: "financialYears.view",
      },
      {
        path: "/dashboard/ledger/journals",
        label: "Journals",
        icon: TbFileText,
        permission: "ledger.journal.view",
      },
      {
        path: "/dashboard/ledger/accounts",
        label: "Chart of Accounts",
        icon: TbReportMoney,
        permission: "ledger.accounts.view",
      },
      {
        path: "/dashboard/contributions",
        label: "Contributions",
        icon: TbCoin,
        permission: "officialsPortal.contributions.view",
      },
      {
        path: "/dashboard/loans",
        label: "Loans",
        icon: FiCreditCard,
        permission: "officialsPortal.loans.view",
      },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      {
        path: "/dashboard/welfare",
        label: "Welfare Claims",
        icon: TbHeartHandshake,
        permission: "officialsPortal.welfareClaims.view",
      },
      {
        path: "/dashboard/meetings",
        label: "Meetings",
        icon: TbFileText,
        permission: "officialsPortal.meetings.view",
      },
      {
        path: "/dashboard/approvals",
        label: "Approvals",
        icon: FiCheckCircle,
        permission: "officialsPortal.approvals.view",
      },
      {
        path: "/dashboard/reports",
        label: "Reports",
        icon: TbReportMoney,
        permission: "officialsPortal.reports.view",
      },
    ],
  },
];

export const officialsNavGroups: NavGroupDef[] = [
  {
    id: "core",
    label: "Core",
    items: [
      {
        path: "/officials",
        label: "Dashboard",
        icon: TbLayoutDashboard,
        permission: "officialsPortal.dashboard.view",
      },
      {
        path: "/officials/members",
        label: "Members",
        icon: TbUsers,
        permission: "officialsPortal.members.view",
      },
    ],
  },
  {
    id: "finance",
    label: "Finance & ledger",
    items: [
      {
        path: "/officials/ledger/financial-years",
        label: "Financial Years",
        icon: TbChartBar,
        permission: "financialYears.view",
      },
      {
        path: "/officials/ledger/journals",
        label: "Journals",
        icon: TbFileText,
        permission: "ledger.journal.view",
      },
      {
        path: "/officials/ledger/accounts",
        label: "Chart of Accounts",
        icon: TbReportMoney,
        permission: "ledger.accounts.view",
      },
      {
        path: "/officials/contributions",
        label: "Contributions",
        icon: TbCoin,
        permission: "officialsPortal.contributions.view",
      },
      {
        path: "/officials/loans",
        label: "Loans",
        icon: FiCreditCard,
        permission: "officialsPortal.loans.view",
      },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      {
        path: "/officials/welfare",
        label: "Welfare Claims",
        icon: TbHeartHandshake,
        permission: "officialsPortal.welfareClaims.view",
      },
      {
        path: "/officials/meetings",
        label: "Meetings",
        icon: TbFileText,
        permission: "officialsPortal.meetings.view",
      },
      {
        path: "/officials/approvals",
        label: "Approvals",
        icon: FiCheckCircle,
        permission: "officialsPortal.approvals.view",
      },
      {
        path: "/officials/reports",
        label: "Reports",
        icon: TbReportMoney,
        permission: "officialsPortal.reports.view",
      },
    ],
  },
];

export function filterNavGroups(
  groups: NavGroupDef[],
  permissions: string[],
): NavGroupDef[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.permission || permissions.includes(item.permission),
      ),
    }))
    .filter((group) => group.items.length > 0);
}
