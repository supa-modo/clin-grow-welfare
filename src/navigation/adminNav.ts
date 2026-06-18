import type { ElementType } from "react";
import {
  TbCalendarEvent,
  TbChartBar,
  TbCoin,
  TbFileText,
  TbHeartHandshake,
  TbLayoutDashboard,
  TbReportMoney,
  TbSettings,
  TbShieldLock,
  TbUserCog,
  TbUsers,
} from "react-icons/tb";
import { FiCheckCircle, FiCreditCard } from "react-icons/fi";
import { MdSpaceDashboard } from "react-icons/md";
import { PiUsersThreeDuotone } from "react-icons/pi";
import { FaClipboardUser } from "react-icons/fa6";

export type NavItemDef = {
  path: string;
  label: string;
  icon: ElementType;
  permission?: string;
  exactMatch?: boolean;
  /** Shown only to SystemAdmin and Treasurer (sidebar). */
  ledgerNavOnly?: boolean;
};

/** @deprecated Use flat nav item arrays; kept for type compatibility. */
export type NavGroupDef = {
  id: string;
  label: string;
  items: NavItemDef[];
};

export const adminNavItems: NavItemDef[] = [
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: MdSpaceDashboard,
    exactMatch: true,
  },
  {
    path: "/dashboard/members",
    label: "Members",
    icon: PiUsersThreeDuotone,
    permission: "officialsPortal.members.view",
  },
  {
    path: "/dashboard/users",
    label: "User Roles",
    icon: FaClipboardUser,
    permission: "users.view",
  },
  {
    path: "/dashboard/roles",
    label: "Roles",
    icon: TbShieldLock,
    permission: "roles.view",
  },
  {
    path: "/dashboard/settings",
    label: "Settings",
    icon: TbSettings,
    permission: "welfareSettings.view",
  },
  {
    path: "/dashboard/meetings",
    label: "Meetings",
    icon: TbCalendarEvent,
    permission: "officialsPortal.meetings.view",
  },
  {
    path: "/dashboard/ledger/financial-years",
    label: "Financial Years",
    icon: TbChartBar,
    permission: "financialYears.view",
  },
  {
    path: "/dashboard/ledger",
    label: "Ledger",
    icon: TbFileText,
    permission: "ledger.journal.view",
    ledgerNavOnly: true,
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
  {
    path: "/dashboard/welfare",
    label: "Welfare Claims",
    icon: TbHeartHandshake,
    permission: "officialsPortal.welfareClaims.view",
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
];

export const officialsNavItems: NavItemDef[] = [
  {
    path: "/officials",
    label: "Dashboard",
    icon: TbLayoutDashboard,
    permission: "officialsPortal.dashboard.view",
    exactMatch: true,
  },
  {
    path: "/officials/members",
    label: "Members",
    icon: TbUsers,
    permission: "officialsPortal.members.view",
  },
  {
    path: "/officials/meetings",
    label: "Meetings",
    icon: TbCalendarEvent,
    permission: "officialsPortal.meetings.view",
  },
  {
    path: "/officials/ledger/financial-years",
    label: "Financial Years",
    icon: TbChartBar,
    permission: "financialYears.view",
  },
  {
    path: "/officials/ledger",
    label: "Ledger",
    icon: TbFileText,
    permission: "ledger.journal.view",
    ledgerNavOnly: true,
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
  {
    path: "/officials/welfare",
    label: "Welfare Claims",
    icon: TbHeartHandshake,
    permission: "officialsPortal.welfareClaims.view",
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
  {
    path: "/officials/settings",
    label: "Settings",
    icon: TbSettings,
    permission: "welfareSettings.view",
  },
];

/** @deprecated Use adminNavItems */
export const adminNavGroups: NavGroupDef[] = [
  { id: "all", label: "", items: adminNavItems },
];

/** @deprecated Use officialsNavItems */
export const officialsNavGroups: NavGroupDef[] = [
  { id: "all", label: "", items: officialsNavItems },
];

export function filterNavItems(
  items: NavItemDef[],
  permissions: string[],
  roles: string[] = [],
): NavItemDef[] {
  if (roles.includes("SystemAdmin")) return items;
  return items.filter(
    (item) => !item.permission || permissions.includes(item.permission),
  );
}

export function filterNavGroups(
  groups: NavGroupDef[],
  permissions: string[],
  roles: string[] = [],
): NavGroupDef[] {
  return groups
    .map((group) => ({
      ...group,
      items: filterNavItems(group.items, permissions, roles),
    }))
    .filter((group) => group.items.length > 0);
}
