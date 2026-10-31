import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { emptyRecommendation } from '@/services/constitutionRecommendations';
import type { RecommendationInput } from '@/services/constitutionRecommendations';

export const maxSuggestions = 20;
export type DraftRow = RecommendationInput & { id: string };
type Draft = { version: 1; submissionId: string; rows: DraftRow[]; savedAt: string | null };
const rowSchema = z.object({
  id: z.string().uuid(), article: z.string().max(200), currentStatement: z.string().max(5000),
  proposedAmendment: z.string().max(5000), justification: z.string().max(5000),
});
const schema = z.object({
  version: z.literal(1), submissionId: z.string().uuid(), rows: z.array(rowSchema).min(1).max(maxSuggestions), savedAt: z.string().datetime().nullable(),
}).refine(value => new Set(value.rows.map(row => row.id)).size === value.rows.length);

export const newDraftRow = (): DraftRow => ({ id: crypto.randomUUID(), ...emptyRecommendation });
const fresh = (): Draft => ({ version: 1, submissionId: crypto.randomUUID(), rows: [newDraftRow()], savedAt: null });
export const hasDraftText = (rows: DraftRow[]) => rows.some(row => Object.entries(row).some(([key, value]) => key !== 'id' && value.length > 0));

function read(key: string): { draft: Draft; raw: string | null; warning: string } {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { draft: fresh(), raw, warning: '' };
    let value: unknown;
    try { value = JSON.parse(raw); }
    catch { return { draft: fresh(), raw, warning: 'The saved draft could not be restored. Please check your suggestions before continuing.' }; }
    const parsed = schema.safeParse(value);
    if (!parsed.success) return { draft: fresh(), raw, warning: 'The saved draft could not be restored. Please check your suggestions before continuing.' };
    return { draft: { ...parsed.data, savedAt: parsed.data.savedAt ?? null }, raw, warning: '' };
  } catch {
    return { draft: fresh(), raw: null, warning: 'Draft saving is unavailable in this browser. Keep this page open until you submit.' };
  }
}

export function useConstitutionDraft(userId: string) {
  const key = `clingrow.constitution-draft.v1:${userId}`;
  const [initial] = useState(() => read(key));
  const [draft, setDraft] = useState<Draft>(initial.draft);
  const [warning, setWarning] = useState(initial.warning);
  const [restored, setRestored] = useState(Boolean(initial.draft.savedAt));
  const [conflict, setConflict] = useState(false);
  const lastRaw = useRef(initial.raw);

  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if ((event.key === key || event.key === null) && event.newValue !== lastRaw.current) setConflict(true);
    };
    const check = () => {
      try { if (localStorage.getItem(key) !== lastRaw.current) setConflict(true); }
      catch { /* Persistence failures are reported when saving. */ }
    };
    window.addEventListener('storage', changed);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.removeEventListener('storage', changed);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [key]);

  useEffect(() => {
    if (!warning || !hasDraftText(draft.rows)) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [warning, draft.rows]);

  function persist(next: Draft, force = false) {
    try {
      if (!force && localStorage.getItem(key) !== lastRaw.current) { setConflict(true); return; }
    } catch { /* Keep editing in memory if storage is unavailable. */ }
    setDraft(next);
    setRestored(false);
    try {
      const raw = hasDraftText(next.rows) ? JSON.stringify(next) : null;
      if (raw) localStorage.setItem(key, raw);
      else localStorage.removeItem(key);
      lastRaw.current = raw;
      setWarning('');
    } catch {
      setWarning('Draft saving is unavailable in this browser. Keep this page open until you submit.');
    }
  }

  function change(rows: DraftRow[]) {
    if (conflict) return;
    // Edits start a new version; unchanged retries retain their saved submission ID.
    persist({ version: 1, submissionId: crypto.randomUUID(), rows, savedAt: new Date().toISOString() });
  }

  function reset(submittedId?: string) {
    if (!submittedId && !isCurrent()) return;
    try {
      const raw = localStorage.getItem(key);
      // A successful submit in this tab must not erase a newer draft in another tab.
      if (!submittedId || !raw || JSON.parse(raw).submissionId === submittedId) {
        localStorage.removeItem(key);
        lastRaw.current = null;
      }
    } catch { setWarning('Unable to clear the saved draft on this device.'); }
    setDraft(fresh());
    setRestored(false);
  }

  function reload() {
    const saved = read(key);
    lastRaw.current = saved.raw;
    setDraft(saved.draft);
    setWarning(saved.warning);
    setRestored(Boolean(saved.draft.savedAt));
    setConflict(false);
  }

  function keep() {
    setConflict(false);
    persist({ ...draft, submissionId: crypto.randomUUID(), savedAt: new Date().toISOString() }, true);
  }

  function isCurrent() {
    try {
      if (localStorage.getItem(key) !== lastRaw.current) {
        setConflict(true);
        return false;
      }
    } catch { /* Storage failure should not prevent sending the in-memory draft. */ }
    return !conflict;
  }

  return { draft, warning, restored, conflict, change, reset, reload, keep, isCurrent };
}
