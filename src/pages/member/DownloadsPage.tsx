import { useEffect, useMemo, useState } from 'react';
import { FiBookOpen, FiDownload, FiFileText, FiRefreshCw, FiGrid, FiList } from 'react-icons/fi';
import { TbFileDescription } from 'react-icons/tb';
import { api } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { SearchBar } from '@/components/ui/SearchBar';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { MemberContentHeader } from '@/components/member/MemberContentUi';
import { useUiStore } from '@/store/uiStore';

type DownloadCategory = 'GOVERNANCE' | 'MEETING_SUMMARY' | 'MEETING_MINUTES';
type DownloadDocument = {
  id: string;
  category: DownloadCategory;
  title: string;
  description: string;
  fileName: string;
  mimeType: string;
  documentDate: string;
  downloadUrl: string;
  meetingNumber?: string;
};

const categoryLabels: Record<DownloadCategory, string> = {
  GOVERNANCE: 'Governance',
  MEETING_SUMMARY: 'Meeting summaries',
  MEETING_MINUTES: 'Meeting minutes',
};

function documentIcon(category: DownloadCategory) {
  if (category === 'GOVERNANCE') return <FiBookOpen className="h-5 w-5" />;
  if (category === 'MEETING_MINUTES') return <TbFileDescription className="h-5 w-5" />;
  return <FiFileText className="h-5 w-5" />;
}

function safeFilename(value: string) {
  return value.replace(/[<>:"/\\|?*]+/g, '-').trim() || 'document';
}

export function MemberDownloadsPage() {
  const toastSuccess = useUiStore((state) => state.toastSuccess);
  const toastError = useUiStore((state) => state.toastError);
  const [documents, setDocuments] = useState<DownloadDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [category, setCategory] = useState<DownloadCategory | 'ALL'>('ALL');
  const [downloading, setDownloading] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<{ documents: DownloadDocument[] }>('/member-portal/downloads');
      setDocuments(response.data.documents ?? []);
    } catch {
      setError('We could not load the available member documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const visibleDocuments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return documents.filter((document) => {
      if (category !== 'ALL' && document.category !== category) return false;
      if (!term) return true;
      return [document.title, document.description, document.fileName, document.meetingNumber ?? '']
        .some((value) => value.toLowerCase().includes(term));
    });
  }, [category, documents, search]);

  const download = async (document: DownloadDocument) => {
    setDownloading(document.id);
    try {
      const response = await api.get<Blob>(document.downloadUrl, { responseType: 'blob' });
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: document.mimeType });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = safeFilename(document.fileName);
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toastSuccess('Download ready', document.fileName);
    } catch {
      toastError('Download failed', 'The document could not be downloaded. Please try again.');
    } finally {
      setDownloading('');
    }
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-7 pb-8">
      <MemberContentHeader eyebrow="Member resources" title="Downloads" description="Your library of governance documents, meeting summaries and published minutes."
        action={<Button variant="ghost" className="min-h-11 focus-visible:ring-2 focus-visible:ring-brand-500" icon={<FiRefreshCw />} disabled={loading} onClick={() => void load()}>Refresh</Button>} />
      <section aria-label="Document library" className="min-w-0 rounded-2xl bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by title or meeting…"
            aria-label="Search documents"
            wrapperClassName="min-w-0 w-full max-w-none lg:max-w-md"
          />
          <div className="flex min-w-0 items-center gap-3">
            <label className="min-w-0 flex-1"><span className="sr-only">Document category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value as DownloadCategory | 'ALL')} className="min-h-11 w-full rounded-xl bg-ink-50 px-3 text-sm text-ink-700 outline-none focus:ring-2 focus:ring-brand-500">
                <option value="ALL">All documents</option>
                {(Object.keys(categoryLabels) as DownloadCategory[]).map((value) => <option key={value} value={value}>{categoryLabels[value]}</option>)}
              </select>
            </label>
            <div className="flex shrink-0 gap-1 rounded-xl bg-ink-50 p-1" role="group" aria-label="Document view">
              {(['list', 'grid'] as const).map((option) => <button key={option} type="button" aria-label={`${option === 'list' ? 'List' : 'Grid'} view`} aria-pressed={view === option} onClick={() => setView(option)} className={`grid h-10 w-10 place-items-center rounded-lg transition focus-visible:outline-2 focus-visible:outline-brand-600 ${view === option ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-400 hover:text-ink-700'}`}>{option === 'list' ? <FiList size={20} /> : <FiGrid size={19} />}</button>)}
            </div>
          </div>
        </div>
        <div className="my-5 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500" aria-live="polite">
          <span>{loading ? 'Loading library…' : `${visibleDocuments.length} document${visibleDocuments.length === 1 ? '' : 's'}${category !== 'ALL' || search ? ` of ${documents.length}` : ''}`}</span>
          <span>Official member documents</span>
        </div>
        {loading ? <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-ink-500" role="status"><Spinner /> Loading documents…</div>
          : error ? <div role="alert" className="rounded-xl bg-red-50 p-5 text-sm text-red-700">{error}<Button variant="ghost" className="ml-2 min-h-11" onClick={() => void load()}>Try again</Button></div>
          : visibleDocuments.length === 0 ? <EmptyState title={documents.length ? 'No documents found' : 'Your library is empty'} message={documents.length ? 'Try another search or document category.' : 'Published member documents will appear here.'} />
          : <>
            {view === 'list' && <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1fr)_10rem_7rem_8rem] gap-4 border-b border-ink-100 pb-3 text-xs font-semibold text-ink-400 xl:grid"><span>Document</span><span>Category</span><span>Published</span><span className="text-right">Download</span></div>}
            <div className={view === 'grid' ? 'grid gap-4 md:grid-cols-2 xl:grid-cols-3' : 'divide-y divide-ink-100'}>
              {visibleDocuments.map((document) => {
                const format = document.fileName.split('.').pop()?.toUpperCase() || 'FILE';
                const date = document.category === 'GOVERNANCE' ? 'Reference' : new Date(document.documentDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
                return <article key={document.id} className={view === 'grid' ? 'flex min-w-0 flex-col rounded-xl bg-ink-50/70 p-5' : 'grid min-w-0 grid-cols-[minmax(0,1fr)] items-center gap-3 py-5 xl:grid-cols-[minmax(0,1fr)_10rem_7rem_8rem] xl:gap-4'}>
                  <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                    <div aria-hidden="true" className="relative flex h-16 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-50 pb-3 text-brand-600">{documentIcon(document.category)}<span className="absolute inset-x-0 bottom-0 rounded-b-lg bg-brand-700 py-1 text-center text-[9px] font-bold tracking-wide text-white">{format.slice(0, 5)}</span></div>
                    <div className="min-w-0"><h2 className="break-words text-sm font-bold leading-6 text-ink-900">{document.title}</h2><p className="mt-1 line-clamp-2 text-sm leading-5 text-ink-500">{document.description}</p><p className="mt-1 truncate text-xs text-ink-400" title={document.fileName}>{document.fileName}</p></div>
                  </div>
                  <div className={view === 'grid' ? 'mt-5 text-xs text-brand-700' : 'text-xs font-medium text-ink-500'}>{categoryLabels[document.category]}</div>
                  <p className={view === 'grid' ? 'mt-2 text-xs text-ink-400' : 'text-xs text-ink-400'}>{date}</p>
                  <Button variant="ghost" className={view === 'grid' ? 'mt-5 min-h-11 w-full bg-white focus-visible:ring-2 focus-visible:ring-brand-500' : 'min-h-11 w-full bg-ink-50 text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500 xl:w-auto'} icon={<FiDownload />} isLoading={downloading === document.id} disabled={Boolean(downloading)} onClick={() => void download(document)} aria-label={`Download ${document.title}`}>Download</Button>
                </article>;
              })}
            </div>
          </>}
      </section>
    </div>
  );
}
