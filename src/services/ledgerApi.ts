import { api } from './api';
import type { FinancialYear, WelfareSetting, Fund, LedgerAccount, JournalEntry, MemberBalances } from '@/types/ledger';

export const ledgerApi = {
  // Financial Years
  async listFinancialYears() {
    const { data } = await api.get('/ledger/financial-years');
    return data.years as FinancialYear[];
  },
  async getActiveFinancialYear() {
    const { data } = await api.get('/ledger/financial-years/active');
    return data.financialYear as FinancialYear;
  },
  async getSystemSettings() {
    const { data } = await api.get('/ledger/system-settings');
    return data as { financialYear: FinancialYear; settings: WelfareSetting };
  },
  async updateSystemSettings(input: Partial<WelfareSetting> & Partial<{ startDate: string; endDate: string; savingsStopDate?: string; agmDate?: string }>) {
    const { data } = await api.put('/ledger/system-settings', input);
    return data as { financialYear: FinancialYear; settings: WelfareSetting };
  },
  async createFinancialYear(input: { name: string; startDate: string; endDate: string; savingsStopDate?: string; agmDate?: string }) {
    const { data } = await api.post('/ledger/financial-years', input);
    return data.financialYear as FinancialYear;
  },
  async updateFinancialYear(id: string, input: Partial<{ name: string; startDate: string; endDate: string; savingsStopDate?: string; agmDate?: string }>) {
    const { data } = await api.patch(`/ledger/financial-years/${id}`, input);
    return data.financialYear as FinancialYear;
  },
  async activateFinancialYear(id: string) {
    const { data } = await api.post(`/ledger/financial-years/${id}/activate`);
    return data.financialYear as FinancialYear;
  },
  async closeFinancialYear(id: string) {
    const { data } = await api.post(`/ledger/financial-years/${id}/close`);
    return data.financialYear as FinancialYear;
  },
  async upsertWelfareSettings(id: string, input: Partial<WelfareSetting>) {
    const { data } = await api.post(`/ledger/financial-years/${id}/settings`, input);
    return data.settings as WelfareSetting;
  },

  // Funds
  async listFunds() {
    const { data } = await api.get('/ledger/funds');
    return data.funds as Fund[];
  },
  async getFundBalance(id: string) {
    const { data } = await api.get(`/ledger/funds/${id}/balance`);
    return data as { fund: Fund; balance: number };
  },

  // Chart of Accounts
  async listAccounts() {
    const { data } = await api.get('/ledger/accounts');
    return data.accounts as LedgerAccount[];
  },
  async createAccount(input: { code: string; name: string; type: string; fundId?: string; parentId?: string }) {
    const { data } = await api.post('/ledger/accounts', input);
    return data.account as LedgerAccount;
  },
  async getAccountBalance(id: string) {
    const { data } = await api.get(`/ledger/accounts/${id}/balance`);
    return data as { accountId: string; balance: number };
  },

  // Member Balance
  async getMemberBalance(memberId: string) {
    const { data } = await api.get(`/ledger/members/${memberId}/balance`);
    return data.balances as MemberBalances;
  },

  // Journal Entries
  async listJournals(params?: { page?: number; pageSize?: number; search?: string; status?: string }) {
    const { data } = await api.get('/ledger/journals', { params });
    return data as { data: JournalEntry[]; meta: any };
  },
  async getJournal(id: string) {
    const { data } = await api.get(`/ledger/journals/${id}`);
    return data.entry as JournalEntry;
  },
  async postJournal(input: { financialYearId?: string; transactionDate: string; description: string; reference?: string; lines: Array<{ ledgerAccountId: string; memberId?: string; fundId?: string; debitAmount: number; creditAmount: number; description?: string }> }) {
    const { data } = await api.post('/ledger/journals', input);
    return data.entry as JournalEntry;
  },
  async reverseJournal(id: string, reason: string) {
    const { data } = await api.post(`/ledger/journals/${id}/reverse`, { reason });
    return data.entry as JournalEntry;
  },
};
