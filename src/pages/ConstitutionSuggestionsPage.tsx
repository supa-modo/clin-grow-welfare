import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { TbArrowLeft, TbCheck, TbDeviceFloppy, TbDownload, TbPlus, TbSend, TbTrash, TbUser } from "react-icons/tb";
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
    <div className="min-h-dvh bg-white text-slate-800">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <img src="/logo.webp" alt="" className="h-10 w-10 shrink-0 object-contain sm:h-12 sm:w-12" />
            <div className="min-w-0"><p className="text-sm font-bold leading-5 text-primary-900 sm:text-base">Clin-Grow Welfare Group</p><p className="text-xs text-slate-500">Constitution review</p></div>
          </div>
          <Link to={defaultRouteForUser(user)} aria-label="Back to portal" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded px-1 text-sm font-semibold text-primary-700 hover:underline focus-visible:outline-2 focus-visible:outline-primary-600"><TbArrowLeft className="h-4 w-4" aria-hidden="true" /><span className="sm:hidden">Portal</span><span className="hidden sm:inline">Back to portal</span></Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 pb-6 pt-7 sm:px-8 sm:pt-10">
        <div className="mb-6 sm:mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary-700">Your voice matters</p>
          <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight text-primary-900 sm:text-3xl">Help shape our constitution</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Share the changes you would like to see. Add a suggestion for each section or article, then send them together for officials to review.</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
            <a href={apiUrl('/public/constitution/download')} className="inline-flex min-h-8 items-center gap-2 self-start text-sm font-semibold text-primary-700 underline underline-offset-4"><TbDownload className="h-4 w-4 shrink-0" aria-hidden="true" />Read the current constitution (PDF)</a>
            <div className="flex min-w-0 items-start gap-2 text-xs leading-5 text-slate-500"><TbUser className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><p className="min-w-0 break-words">Submitting as <strong className="font-semibold text-slate-700">{user.name || 'Your signed-in account'}</strong></p></div>
          </div>
        </div>
        {submittedCount > 0 ? (
          <section role="status" className="border-t border-slate-200 py-12 text-center sm:py-16">
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
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-y border-slate-200 py-2">
              <div className="flex items-center gap-2 text-xs text-slate-600"><TbDeviceFloppy className="h-4 w-4 text-primary-700" aria-hidden="true" /><span>{warning ? 'Draft not saved' : restored ? 'Saved draft restored' : draft.savedAt && hasDraftText(draft.rows) ? 'Draft saved on this device' : 'Draft saves automatically'}</span></div>
              <button type="button" disabled={locked || !hasDraftText(draft.rows)} onClick={() => setConfirmation('clear')} className="min-h-11 rounded py-2 pl-2 text-xs font-semibold text-slate-500 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-primary-600 disabled:opacity-40">Clear draft</button>
            </div>
            {warning && <p role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{warning}</p>}
            {accountChanged && <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p>Your signed-in account changed in another tab. Your draft is kept with its original account.</p><Button type="button" variant="secondary" className="mt-3" onClick={() => window.location.reload()}>Reload to continue</Button></div>}
            {conflict && <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p>This draft changed in another tab. Choose which version to use before continuing.</p><div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={reload}>Load saved version</Button><Button type="button" variant="secondary" onClick={keep}>Keep this version</Button></div></div>}

            <div>
              {draft.rows.map((row, index) => (
                <fieldset key={row.id} data-testid="suggestion-row" disabled={locked} className="min-w-0 border-t border-slate-200 py-6 first:border-t-0 sm:py-8">
                  <legend className="sr-only">Suggestion {index + 1}</legend>
                  <div className="mb-4 flex items-center justify-between gap-4 sm:mb-5">
                    <h2 className="text-base font-bold text-primary-900">Suggestion {index + 1}</h2>
                    {draft.rows.length > 1 && <button type="button" onClick={() => removeRow(row.id)} aria-label={`Remove suggestion ${index + 1}`} className="flex min-h-11 items-center gap-1.5 rounded px-1 py-2 text-xs font-semibold text-slate-500 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-primary-600"><TbTrash className="h-4 w-4" aria-hidden="true" />Remove</button>}
                  </div>
                  <div className="grid gap-5 sm:gap-6 lg:grid-cols-[0.8fr_1.1fr_1.1fr_1fr]">
                    {recommendationFields.map(({ key, label, placeholder, maxLength }) => {
                      const id = `${row.id}-${key}`;
                      return <div key={key} className="min-w-0"><label htmlFor={id} className="mb-2 block text-sm font-semibold leading-6 text-slate-700 lg:flex lg:min-h-12 lg:items-center">{label}</label><textarea id={id} name={key} required maxLength={maxLength} rows={key === 'article' ? 2 : 4} value={row[key]} onChange={event => change(draft.rows.map(item => item.id === row.id ? { ...item, [key]: event.target.value } : item))} placeholder={placeholder} className="block w-full resize-y rounded-lg border border-slate-300 bg-slate-50/50 px-3 py-3 text-base leading-7 outline-none transition-colors placeholder:text-slate-400 focus:border-primary-600 focus:bg-white focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100 sm:text-sm sm:leading-6 lg:min-h-44" /><p className="mt-1.5 text-right text-[0.7rem] text-slate-400">{row[key].length.toLocaleString()} / {maxLength.toLocaleString()}</p></div>;
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-200 py-5 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="secondary" className="min-h-11 w-full sm:w-auto" disabled={locked || draft.rows.length >= maxSuggestions} onClick={addRow} icon={<TbPlus className="h-4 w-4" />}>Add another suggestion</Button>
              <p className="text-xs text-slate-500">{draft.rows.length} of {maxSuggestions} suggestions · All four fields are required</p>
            </div>
            {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
            <div className="mt-1 flex flex-col-reverse gap-4 border-t border-slate-200 pt-5 md:flex-row md:items-center md:justify-between">
              <p className="max-w-xl text-xs leading-5 text-slate-500">Drafts are private to your account on this device. Officials see your suggestions and contact details only after you submit.</p>
              <Button type="submit" rounded="full" disabled={conflict || accountChanged} isLoading={saving} loadingText="Submitting suggestions…" icon={<TbSend className="h-5 w-5" />} className="min-h-12 w-full shrink-0 sm:w-auto sm:min-h-11">Submit {draft.rows.length === 1 ? 'suggestion' : `${draft.rows.length} suggestions`}</Button>
            </div>
          </form>
        )}
        <p className="mt-10 text-center text-xs leading-5 text-slate-400">Clin-Grow Welfare Group · Building our future together</p>
      </main>
      <NotificationModal isOpen={confirmation !== null} onClose={() => setConfirmation(null)} title={confirmation === 'clear' ? 'Clear your saved draft?' : 'Remove this suggestion?'} message={confirmation === 'clear' ? 'This removes all unfinished suggestions from this account on this device. Submitted recommendations will remain with officials.' : 'This suggestion will be removed from your draft. Your other suggestions will be kept.'} confirmText={confirmation === 'clear' ? 'Clear draft' : 'Remove suggestion'} type="delete" onConfirm={() => { if (confirmation === 'clear') reset(); else change(draft.rows.filter(row => row.id !== confirmation)); setConfirmation(null); setError(''); }} />
    </div>
  );
}
