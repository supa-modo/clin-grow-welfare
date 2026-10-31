import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { TbCopy, TbRefresh } from 'react-icons/tb';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { constitutionRecommendationsApi, recommendationFields } from '@/services/constitutionRecommendations';

export function ConstitutionRecommendationsPage() {
  const [page, setPage] = useState(1);
  const [copyStatus, setCopyStatus] = useState('');
  const { data, isPending, isFetching, isError, refetch } = useQuery({
    queryKey: ['constitution-recommendations', page],
    queryFn: () => constitutionRecommendationsApi.list(page),
  });
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/constitution-suggestions`);
      setCopyStatus('Link copied. You can share it with members.');
    } catch {
      setCopyStatus(`Share this link: ${window.location.origin}/constitution-suggestions`);
    }
  }
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.pageSize ?? 20)));

  return <div>
    <PageHeader title="Constitution recommendations" description="Suggestions submitted by members" actions={<>
      <Button variant="secondary" onClick={() => void copyLink()} icon={<TbCopy />}>Copy member link</Button>
      <Button variant="secondary" disabled={isFetching} onClick={() => void refetch()} icon={<TbRefresh />}>Refresh</Button>
    </>} />
    <div className="mb-5 rounded-xl border border-primary-100 bg-primary-50 p-4 text-sm text-primary-900">
      <p>Members sign in to submit their suggestions together. Their details are recorded with each recommendation. <Link className="font-semibold underline underline-offset-4" to="/constitution-suggestions" target="_blank" rel="noopener noreferrer">Open the suggestion form</Link></p>
      {copyStatus && <p role="status" className="mt-2 break-words">{copyStatus}</p>}
    </div>
    {isPending ? <p role="status" className="py-12 text-center text-sm text-slate-500">Loading recommendations…</p> : isError ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">Unable to load recommendations. Please use Refresh to try again.</div> : data && <>
      <p className="mb-3 text-sm text-slate-500">{data.total} recommendation{data.total === 1 ? '' : 's'} · Most recent first</p>
      {data.items.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><h2 className="font-semibold text-slate-800">No recommendations yet</h2><p className="mt-2 text-sm text-slate-500">Share the member link to invite suggestions.</p></div> : <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="hidden grid-cols-4 gap-5 border-b border-slate-200 bg-slate-50 p-5 lg:grid">{recommendationFields.map(({ key, label }) => <div key={key} className="text-xs font-bold text-slate-600">{label}</div>)}</div>
        {data.items.map((item) => <article key={item.id} className="border-b border-slate-200 p-5 last:border-0">
          <div className="mb-4 flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row">
            <div className="min-w-0">
              <p className="break-words text-sm font-semibold text-primary-900">{item.submittedByName || 'Earlier anonymous submission'}</p>
              {item.submittedByName ? <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                {item.membershipNumber && <span>Member {item.membershipNumber}</span>}
                {item.submittedByEmail && <span className="break-all">{item.submittedByEmail}</span>}
                {item.submittedByPhone && <span>{item.submittedByPhone}</span>}
              </div> : <p className="mt-1 text-xs text-slate-500">Received before sign-in was required; submitter details were not collected.</p>}
            </div>
            <p className="shrink-0 text-xs leading-5 text-slate-500">{item.batchId && <>Suggestion {item.position + 1} · </>}Submitted {new Date(item.createdAt).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'medium', timeStyle: 'short' })}</p>
          </div>
          <dl className="grid gap-5 lg:grid-cols-4">{recommendationFields.map(({ key, label }) => <div key={key} className="min-w-0"><dt className="mb-1 text-xs font-semibold text-slate-500 lg:sr-only">{label}</dt><dd className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{item[key]}</dd></div>)}</dl>
        </article>)}
      </div>}
      {pages > 1 && <nav aria-label="Recommendations pages" className="mt-5 flex items-center justify-between gap-3"><Button variant="secondary" disabled={page === 1 || isFetching} onClick={() => setPage(page - 1)}>Previous</Button><span className="text-sm text-slate-500">Page {page} of {pages}</span><Button variant="secondary" disabled={page >= pages || isFetching} onClick={() => setPage(page + 1)}>Next</Button></nav>}
    </>}
  </div>;
}
