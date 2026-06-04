import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { api } from '@/services/api';
import { useUiStore } from '@/store/uiStore';
import { getApiError } from '@/pages/admin/shared/adminFormatters';
import type { MeetingRecord } from '../../types';

type Resolution = {
  id: string;
  resolutionNumber: string;
  title: string;
  decision: string;
  votesFor?: number;
  votesAgainst?: number;
  votesAbstain?: number;
};

type Props = {
  meeting: MeetingRecord;
  resolutions?: Resolution[];
  busy: string;
  onRecorded: () => void;
};

export function ResolutionsStep({ meeting, resolutions = [], busy, onRecorded }: Props) {
  const toastSuccess = useUiStore((s) => s.toastSuccess);
  const toastError = useUiStore((s) => s.toastError);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | 'DEFERRED'>('APPROVED');
  const [votesFor, setVotesFor] = useState('');
  const [votesAgainst, setVotesAgainst] = useState('');
  const [votesAbstain, setVotesAbstain] = useState('');
  const blocked = !!busy || meeting.status === 'CLOSED';

  const record = async () => {
    if (title.trim().length < 3) {
      toastError('Title required', 'Enter a resolution title of at least 3 characters.');
      return;
    }
    try {
      await api.post(`/meetings/${meeting.id}/resolutions`, {
        title: title.trim(),
        description: description.trim() || undefined,
        decision,
        votesFor: votesFor ? Number(votesFor) : undefined,
        votesAgainst: votesAgainst ? Number(votesAgainst) : undefined,
        votesAbstain: votesAbstain ? Number(votesAbstain) : undefined,
      });
      setTitle('');
      setDescription('');
      toastSuccess('Resolution recorded', 'The decision is saved on this meeting.');
      onRecorded();
    } catch (error) {
      toastError('Could not record resolution', getApiError(error));
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <p className="font-bold text-ink-900">Record resolution</p>
        <p className="mt-1 text-sm text-ink-600">Capture formal decisions from this sitting. Published minutes will include these for members.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-ink-700">Title</label>
            <input className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" value={title} disabled={blocked} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-ink-700">Description</label>
            <textarea className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" rows={2} value={description} disabled={blocked} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink-700">Decision</label>
            <select className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" value={decision} disabled={blocked} onChange={(e) => setDecision(e.target.value as typeof decision)}>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="DEFERRED">Deferred</option>
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-600">For</label>
              <input className="w-full rounded-lg border border-ink-200 px-2 py-2 text-sm" inputMode="numeric" value={votesFor} disabled={blocked} onChange={(e) => setVotesFor(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-600">Against</label>
              <input className="w-full rounded-lg border border-ink-200 px-2 py-2 text-sm" inputMode="numeric" value={votesAgainst} disabled={blocked} onChange={(e) => setVotesAgainst(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-600">Abstain</label>
              <input className="w-full rounded-lg border border-ink-200 px-2 py-2 text-sm" inputMode="numeric" value={votesAbstain} disabled={blocked} onChange={(e) => setVotesAbstain(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Button disabled={blocked} onClick={() => void record()}>Save resolution</Button>
        </div>
      </Card>
      {resolutions.length ? (
        <Card className="p-4">
          <p className="font-bold text-ink-900">Recorded ({resolutions.length})</p>
          <ul className="mt-3 space-y-2 text-sm">
            {resolutions.map((row) => (
              <li key={row.id} className="rounded-lg bg-ink-50 px-3 py-2">
                <p className="font-semibold text-ink-900">{row.resolutionNumber} — {row.title}</p>
                <p className="text-ink-600">{row.decision} · For {row.votesFor ?? 0} / Against {row.votesAgainst ?? 0} / Abstain {row.votesAbstain ?? 0}</p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
