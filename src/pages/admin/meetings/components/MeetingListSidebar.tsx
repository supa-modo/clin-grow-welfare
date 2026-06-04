import { useEffect, useMemo, useState } from 'react';
import { FiTrash2 } from 'react-icons/fi';
import { Badge } from '@/components/ui/Badge';
import { SearchBar } from '@/components/ui/SearchBar';
import MultiFilterDropdown, { type MultiFilterValue } from '@/components/ui/MultiFilterDropdown';
import { api } from '@/services/api';
import { tone } from '@/pages/admin/shared/adminFormatters';
import type { MeetingRecord } from '../types';

type Props = {
  meetings: MeetingRecord[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onDelete: (meeting: MeetingRecord) => void;
};

type FinancialYear = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
};

const activeStatuses = new Set(['SCHEDULED', 'NOTICE_SENT', 'ATTENDANCE_RECORDING', 'COLLECTIONS_OPEN', 'LOAN_WINDOW_OPEN', 'RESOLUTIONS_OPEN', 'CLOSING_REVIEW', 'ONGOING']);

export function MeetingListSidebar({ meetings, selectedId, onSelect, onDelete }: Props) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<MultiFilterValue>({ type: [], financialYear: [] });
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);

  useEffect(() => {
    void api.get('/ledger/financial-years').then((res) => {
      setFinancialYears(res.data.years ?? []);
    }).catch(() => setFinancialYears([]));
  }, []);

  const types = useMemo(() => Array.from(new Set(meetings.map((meeting) => meeting.meetingType))).sort(), [meetings]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase().replace(/-/g, '/');
    const selectedFy = financialYears.filter((fy) => filters.financialYear?.includes(fy.id));
    return meetings
      .filter((meeting) => {
        const typeOk = !filters.type?.length || filters.type.includes(meeting.meetingType);
        if (!typeOk) return false;
        if (selectedFy.length) {
          const meetingTime = new Date(meeting.meetingDate).getTime();
          const fyOk = selectedFy.some((fy) => {
            const start = new Date(fy.startDate).getTime();
            const end = new Date(fy.endDate).getTime();
            return meetingTime >= start && meetingTime <= end;
          });
          if (!fyOk) return false;
        }
        if (!normalizedQuery) return true;
        const dateLabel = new Date(meeting.meetingDate).toLocaleDateString('en-GB').toLowerCase();
        return [meeting.meetingNumber, meeting.agenda ?? '', meeting.venue ?? '', dateLabel]
          .some((value) => value.toLowerCase().replace(/-/g, '/').includes(normalizedQuery));
      })
      .sort((a, b) => {
        const activeDiff = Number(activeStatuses.has(b.status)) - Number(activeStatuses.has(a.status));
        if (activeDiff) return activeDiff;
        return new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime();
      });
  }, [filters, financialYears, meetings, query]);

  return (
    <aside className="flex min-h-0 flex-col rounded-xl border border-ink-100 bg-white">
      <div className="shrink-0 space-y-3 border-b border-ink-100 p-3">
        <SearchBar value={query} onChange={setQuery} placeholder="Search meetings, agenda, date" wrapperClassName="max-w-none" />
        <MultiFilterDropdown
          value={filters}
          onChange={setFilters}
          buttonLabel="Filters"
          sections={[
            { id: 'type', title: 'Meeting type', options: types.map((value) => ({ value, label: value.replace(/_/g, ' ') })), allowMultiple: true },
            {
              id: 'financialYear',
              title: 'Financial year',
              options: financialYears.map((fy) => ({ value: fy.id, label: fy.name })),
              allowMultiple: true,
            },
          ]}
        />
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3" data-route-scroll-container>
        {filtered.map((meeting) => (
          <div
            key={meeting.id}
            className={`group rounded-xl border transition ${selectedId === meeting.id ? 'border-brand-500 bg-brand-50 shadow-sm' : 'border-ink-100 bg-white hover:border-brand-200'}`}
          >
            <button type="button" onClick={() => onSelect(meeting.id)} className="w-full p-4 text-left">
              <div className="flex items-start justify-between gap-2">
                <span className="font-extrabold text-ink-900">{meeting.meetingNumber}</span>
                <Badge tone={tone(meeting.status)}>{meeting.status}</Badge>
              </div>
              <p className="mt-1 text-xs font-semibold text-ink-500">{new Date(meeting.meetingDate).toLocaleString()}</p>
              <p className="mt-2 line-clamp-2 text-sm text-ink-600">{meeting.agenda}</p>
            </button>
            {meeting.status !== 'CLOSED' ? (
              <div className="flex justify-end border-t border-ink-100 px-3 py-2">
                <button
                  type="button"
                  onClick={() => onDelete(meeting)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-200"
                  title="Delete meeting"
                  aria-label={`Delete ${meeting.meetingNumber}`}
                >
                  <FiTrash2 />
                </button>
              </div>
            ) : null}
          </div>
        ))}
        {!filtered.length ? <p className="rounded-lg bg-ink-50 px-3 py-6 text-center text-sm font-semibold text-ink-500">No meetings match the current filters.</p> : null}
      </div>
    </aside>
  );
}
