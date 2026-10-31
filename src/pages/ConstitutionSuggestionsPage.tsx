import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { TbCheck, TbDeviceFloppy, TbDownload, TbPlus, TbSend, TbTrash, TbUser } from "react-icons/tb";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Feedback";
import { NotificationModal } from "@/components/ui/NotificationModal";
import { apiUrl } from "@/services/api";
import { constitutionRecommendationsApi, recommendationError, recommendationFields } from "@/services/constitutionRecommendations";
import { hasDraftText, maxSuggestions, newDraftRow, useConstitutionDraft } from "@/hooks/useConstitutionDraft";
import { constitutionLoginPath } from "@/lib/constitutionReview";
import { defaultRouteForUser } from "@/lib/workspaces";
import type { AuthUser } from "@/lib/workspaces";
import { useAuthStore } from "@/store/auth";

export function ConstitutionSuggestionsPage() {
  const user = useAuthStore(state => state.user);
  const token = useAuthStore(state => state.token);
  const status = useAuthStore(state => state.status);
  const [enteredWithSession] = useState(Boolean(token && user));
  if (status !== 'ready') return <div className="grid min-h-dvh place-items-center"><Spinner /></div>;
  if (!token || !user) return <Navigate to={constitutionLoginPath(enteredWithSession)} replace />;
  return <ConstitutionSuggestionsForm key={user.id} user={user} />;
}

function ConstitutionSuggestionsForm({ user }: { user: AuthUser }) {
  const { draft, warning, restored, conflict, change, reset, reload, keep, isCurrent } = useConstitutionDraft(user.id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [submittedCount, setSubmittedCount] = useState(0);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [accountChanged, setAccountChanged] = useState(false);
  const inFlight = useRef(false);
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const locked = saving || conflict || accountChanged;

  function sameAccount() {
    try { return JSON.parse(localStorage.getItem('clingrow_user') || 'null')?.id === user.id; }
    catch { return false; }
  }

  useEffect(() => {
    const check = () => {
      try { if (JSON.parse(localStorage.getItem('clingrow_user') || 'null')?.id !== user.id) setAccountChanged(true); }
      catch { setAccountChanged(true); }
    };
    const changed = (event: StorageEvent) => {
      if (event.key === 'clingrow_user' || event.key === null) check();
    };
    window.addEventListener('storage', changed);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.removeEventListener('storage', changed);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [user.id]);

  function addRow() {
    if (locked || draft.rows.length >= maxSuggestions) return;
    const row = newDraftRow();
    change([...draft.rows, row]);
    requestAnimationFrame(() => document.getElementById(`${row.id}-article`)?.focus());
  }

  function removeRow(id: string) {
    const row = draft.rows.find(row => row.id === id);
    if (row && hasDraftText([row])) setConfirmation(id);
    else change(draft.rows.filter(row => row.id !== id));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || accountChanged || !isCurrent()) return;
    if (!sameAccount()) { setAccountChanged(true); return; }
    const recommendations = draft.rows.map(row => ({
      article: row.article.trim(), currentStatement: row.currentStatement.trim(),
      proposedAmendment: row.proposedAmendment.trim(), justification: row.justification.trim(),
    }));
    const invalid = recommendations.findIndex(row => recommendationFields.some(({ key }) => !row[key]));
    if (invalid !== -1) {
      setError(`Please complete all four fields in suggestion ${invalid + 1}, or remove that suggestion.`);
      document.getElementById(`${draft.rows[invalid].id}-article`)?.focus();
      return;
    }
    inFlight.current = true;
    setSaving(true);
    setError("");
    try {
      const response = await constitutionRecommendationsApi.submit({ submissionId: draft.submissionId, recommendations });
      reset(draft.submissionId);
      setSubmittedCount(response.data.count);
      requestAnimationFrame(() => document.getElementById('submission-confirmation')?.focus());
    } catch (err) {
      if ((err as { response?: { status: number } }).response?.status === 401) {
        useAuthStore.getState().clearSession();
        navigate(constitutionLoginPath(true), { replace: true });
      } else setError(recommendationError(err));
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/logo.webp" alt="" className="h-14 w-14 shrink-0 object-contain" />
            <div><p className="font-bold text-primary-800">Clin-Grow Welfare Group</p><p className="text-xs text-slate-500">Constitution review</p></div>
          </div>
          <Link to={defaultRouteForUser(user)} className="shrink-0 text-sm font-semibold text-primary-700 hover:underline">Back to portal</Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="mb-2 text-sm font-bold text-secondary-700">Your voice matters</p>
            <h1 className="text-xl font-bold tracking-tight text-primary-900 md:text-3xl">Help shape our constitution</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">Recommend the changes you would like to see. Add a suggestion for each section or article, then submit them together for officials to review.</p>
            <a href={apiUrl('/public/constitution/download')} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-700 underline underline-offset-4"><TbDownload aria-hidden="true" />Read the current constitution (PDF)</a>
          </div>
          <div className="flex max-w-sm items-start gap-3 rounded-xl border border-primary-100 bg-white px-4 py-3">
            <TbUser className="mt-0.5 h-5 w-5 shrink-0 text-primary-700" aria-hidden="true" />
            <div className="min-w-0"><p className="text-xs text-slate-500">Submitting as</p><p className="break-words text-sm font-semibold text-primary-900">{user.name || 'Your signed-in account'}</p><p className="mt-1 text-xs leading-5 text-slate-500">Your details will accompany your suggestions.</p></div>
          </div>
        </div>

        {submittedCount > 0 ? (
          <section role="status" className="rounded-2xl border border-primary-200 bg-white p-8 text-center sm:p-12">
            <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center">
              <TbCheck className="h-10 w-10 text-primary-700" aria-hidden="true" />
              <motion.svg aria-hidden="true" className="absolute inset-0 h-full w-full" viewBox="0 0 100 100"><motion.circle cx="50" cy="50" r="47" fill="none" stroke="#15803d" strokeWidth="4" strokeLinecap="round" initial={{ pathLength: reducedMotion ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reducedMotion ? 0 : 0.8 }} /></motion.svg>
            </div>
            <h2 id="submission-confirmation" tabIndex={-1} className="text-xl font-bold text-primary-900 outline-none">Thank you for your suggestions</h2>
            <p className="mb-6 mt-3 text-sm text-slate-600">{submittedCount} suggestion{submittedCount === 1 ? ' has' : 's have'} been saved with your details for officials to review.</p>
            <Button onClick={() => setSubmittedCount(0)}>Make more suggestions</Button>
          </section>
        ) : (
          <form onSubmit={submit}>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-slate-600"><TbDeviceFloppy className="h-4 w-4 text-primary-700" aria-hidden="true" /><span>{warning ? 'Draft not saved' : restored ? 'Saved draft restored' : draft.savedAt && hasDraftText(draft.rows) ? 'Draft saved on this device' : 'Your draft saves automatically on this device'}</span></div>
              <button type="button" disabled={locked || !hasDraftText(draft.rows)} onClick={() => setConfirmation('clear')} className="rounded px-2 py-1 text-xs font-semibold text-slate-500 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-primary-600 disabled:opacity-40">Clear draft</button>
            </div>
            {warning && <p role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{warning}</p>}
            {accountChanged && <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p>Your signed-in account changed in another tab. Your draft is kept with its original account.</p><Button type="button" variant="secondary" className="mt-3" onClick={() => window.location.reload()}>Reload to continue</Button></div>}
            {conflict && <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p>This draft changed in another tab. Choose which version to use before continuing.</p><div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={reload}>Load saved version</Button><Button type="button" variant="secondary" onClick={keep}>Keep this version</Button></div></div>}

            <div className="space-y-5">
              {draft.rows.map((row, index) => (
                <fieldset key={row.id} data-testid="suggestion-row" disabled={locked} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <legend className="sr-only">Suggestion {index + 1}</legend>
                  <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-6">
                    <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-sm font-bold text-primary-700">{String(index + 1).padStart(2, '0')}</span><h2 className="text-sm font-bold text-primary-900">Suggestion {index + 1}</h2></div>
                    {draft.rows.length > 1 && <button type="button" onClick={() => removeRow(row.id)} aria-label={`Remove suggestion ${index + 1}`} className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-slate-500 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-primary-600"><TbTrash className="h-4 w-4" aria-hidden="true" />Remove</button>}
                  </div>
                  <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[0.8fr_1.1fr_1.1fr_1fr]">
                    {recommendationFields.map(({ key, label, placeholder, maxLength }) => {
                      const id = `${row.id}-${key}`;
                      return <div key={key} className="min-w-0"><label htmlFor={id} className="mb-2 flex min-h-10 items-center text-sm font-semibold text-slate-700">{label}</label><textarea id={id} name={key} required maxLength={maxLength} rows={6} value={row[key]} onChange={event => change(draft.rows.map(item => item.id === row.id ? { ...item, [key]: event.target.value } : item))} placeholder={placeholder} className="w-full resize-y rounded-xl border border-slate-300 bg-white p-3 text-sm leading-6 outline-none placeholder:text-slate-400 focus:border-primary-600 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-50" /><p className="mt-1 text-right text-xs text-slate-400">{row[key].length.toLocaleString()} / {maxLength.toLocaleString()}</p></div>;
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <Button type="button" variant="secondary" disabled={locked || draft.rows.length >= maxSuggestions} onClick={addRow} icon={<TbPlus className="h-4 w-4" />}>Add another suggestion</Button>
              <p className="text-xs text-slate-500">{draft.rows.length} of {maxSuggestions} suggestions · All four fields are required</p>
            </div>
            {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
            <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-5 md:flex-row md:items-center md:justify-between">
              <p className="max-w-xl text-xs leading-5 text-slate-500">Drafts are private to your account on this device. Officials see your suggestions and contact details only after you submit.</p>
              <Button type="submit" rounded="full" disabled={conflict || accountChanged} isLoading={saving} loadingText="Submitting suggestions…" icon={<TbSend className="h-5 w-5" />} className="min-h-11 shrink-0">Submit {draft.rows.length === 1 ? 'suggestion' : `${draft.rows.length} suggestions`}</Button>
            </div>
          </form>
        )}
        <p className="mt-8 text-center text-xs text-slate-400">Clin-Grow Welfare Group · Building our future together</p>
      </main>
      <NotificationModal isOpen={confirmation !== null} onClose={() => setConfirmation(null)} title={confirmation === 'clear' ? 'Clear your saved draft?' : 'Remove this suggestion?'} message={confirmation === 'clear' ? 'This removes all unfinished suggestions from this account on this device. Submitted recommendations will remain with officials.' : 'This suggestion will be removed from your draft. Your other suggestions will be kept.'} confirmText={confirmation === 'clear' ? 'Clear draft' : 'Remove suggestion'} type="delete" onConfirm={() => { if (confirmation === 'clear') reset(); else change(draft.rows.filter(row => row.id !== confirmation)); setConfirmation(null); setError(''); }} />
    </div>
  );
}
