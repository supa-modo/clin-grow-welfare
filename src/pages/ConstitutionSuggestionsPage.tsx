import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { TbCheck, TbDownload, TbSend } from 'react-icons/tb';
import { Button } from '@/components/ui/Button';
import { apiUrl } from '@/services/api';
import { constitutionRecommendationsApi, emptyRecommendation, recommendationError, recommendationFields } from '@/services/constitutionRecommendations';
import type { RecommendationInput } from '@/services/constitutionRecommendations';

export function ConstitutionSuggestionsPage() {
  const [form, setForm] = useState<RecommendationInput>({ ...emptyRecommendation });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const pending = useRef<{ signature: string; id: string } | null>(null);
  const inFlight = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const values = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()])) as RecommendationInput;
    if (recommendationFields.some(({ key }) => !values[key])) {
      setError('Please complete all four fields.');
      return;
    }
    const signature = JSON.stringify(values);
    if (pending.current?.signature !== signature) pending.current = { signature, id: crypto.randomUUID() };
    inFlight.current = true;
    setSaving(true);
    setError('');
    try {
      await constitutionRecommendationsApi.submit({ ...values, submissionId: pending.current.id });
      setSubmitted(true);
      setForm({ ...emptyRecommendation });
      pending.current = null;
    } catch (err) {
      setError(recommendationError(err));
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <img src="/logo.webp" alt="" className="h-14 w-14 object-contain" />
            <div><p className="font-bold text-primary-800">Clin-Grow Welfare Group</p><p className="text-xs text-slate-500">Constitution review</p></div>
          </div>
          <Link to="/login" className="text-sm font-semibold text-primary-700 hover:underline">Portal sign in</Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-8 max-w-3xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-primary-700">Your voice matters</p>
          <h1 className="text-2xl font-bold tracking-tight text-primary-900 sm:text-3xl">Help shape our constitution</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">Recommend a change to the Clin-Grow constitution. Complete the four fields below and our officials will review your suggestion. No sign in is required.</p>
          <a href={apiUrl('/public/constitution/download')} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-700 underline underline-offset-4"><TbDownload aria-hidden="true" /> Read the current constitution (PDF)</a>
        </div>

        {submitted ? (
          <section role="status" className="rounded-2xl border border-green-200 bg-white p-8 text-center sm:p-12">
            <TbCheck className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-50 p-2 text-green-700" />
            <h2 className="text-xl font-bold text-primary-900">Thank you for your recommendation</h2>
            <p className="mb-6 mt-3 text-sm text-slate-600">Your suggestion has been saved for officials to review.</p>
            <Button onClick={() => setSubmitted(false)}>Suggest another change</Button>
          </section>
        ) : (
          <form onSubmit={submit} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5"><h2 className="font-bold text-primary-900">Your recommendation</h2><p className="mt-1 text-sm text-slate-500">One proposed change per submission. All four fields are required.</p></div>
            <fieldset disabled={saving} className="grid min-w-0 gap-6 p-6 lg:grid-cols-[0.8fr_1.1fr_1.1fr_1fr]">
              <legend className="sr-only">Constitution amendment recommendation</legend>
              {recommendationFields.map(({ key, label, placeholder, maxLength }, index) => (
                <div key={key} className="min-w-0">
                  <label htmlFor={key} className="mb-3 flex min-h-10 items-start gap-2 text-sm font-semibold text-slate-700"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs text-primary-700">{index + 1}</span>{label}</label>
                  <textarea id={key} name={key} required maxLength={maxLength} rows={8} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} placeholder={placeholder} className="w-full resize-y rounded-lg border border-slate-300 bg-white p-3 text-sm leading-6 outline-none placeholder:text-slate-400 focus:border-primary-600 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-50" />
                  <p className="mt-1 text-right text-xs text-slate-400">{form[key].length.toLocaleString()} / {maxLength.toLocaleString()}</p>
                </div>
              ))}
            </fieldset>
            {error && <p role="alert" className="mx-6 mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50/70 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-xl text-xs leading-5 text-slate-500">Please avoid including personal or sensitive information. Suggestions are visible only to admins and officials.</p>
              <Button type="submit" isLoading={saving} loadingText="Submitting…" icon={<TbSend />} className="min-h-11 shrink-0">Submit recommendation</Button>
            </div>
          </form>
        )}
        <p className="mt-8 text-center text-xs text-slate-400">Clin-Grow Welfare Group · Building our future together</p>
      </main>
    </div>
  );
}
