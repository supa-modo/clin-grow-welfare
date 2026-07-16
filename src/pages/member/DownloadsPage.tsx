import { useEffect, useMemo, useState } from 'react';
import { FiBookOpen, FiDownload, FiFileText, FiRefreshCw, FiSearch } from 'react-icons/fi';
import { TbFileDescription } from 'react-icons/tb';
import { api } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { MemberSectionCard } from '@/components/member/MemberPortalUi';
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
    <div className="space-y-5 pb-8">
      <PageHeader
        title="Downloads"
        subtitle="Constitution, official meeting summaries, and published meeting minutes"
        action={<Button variant="secondary" icon={<FiRefreshCw />} disabled={loading} onClick={() => void load()}>Refresh</Button>}
      />
      <MemberSectionCard title="Document library" subtitle={`${documents.length} document${documents.length === 1 ? '' : 's'} currently available`}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block flex-1">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search documents or meeting number" className="w-full rounded-xl border border-ink-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
          </label>
          <select value={category} onChange={(event) => setCategory(event.target.value as DownloadCategory | 'ALL')} className="rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm font-semibold text-ink-700">
            <option value="ALL">All documents</option>
            {(Object.keys(categoryLabels) as DownloadCategory[]).map((value) => <option key={value} value={value}>{categoryLabels[value]}</option>)}
          </select>
        </div>
        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-sm font-semibold text-ink-500"><Spinner /> Loading documents...</div>
        ) : error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 p-5 text-sm font-semibold text-red-700">{error}</div>
        ) : visibleDocuments.length === 0 ? (
          <EmptyState title="No documents found" message="Try another search or document category." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleDocuments.map((document) => (
              <article key={document.id} className="flex min-h-48 flex-col rounded-2xl border border-ink-100 bg-ink-50/60 p-4 transition hover:border-brand-200 hover:bg-white hover:shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-brand-100 bg-brand-50 text-brand-700">{documentIcon(document.category)}</span>
                  <Badge tone="neutral">{categoryLabels[document.category]}</Badge>
                </div>
                <h2 className="mt-4 text-sm font-extrabold text-ink-900">{document.title}</h2>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-500">{document.description}</p>
                <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-ink-500" title={document.fileName}>{document.fileName}</p>
                    {document.category !== 'GOVERNANCE' ? <p className="mt-1 text-[0.7rem] text-ink-400">{new Date(document.documentDate).toLocaleDateString('en-KE')}</p> : null}
                  </div>
                  <Button size="sm" icon={<FiDownload />} isLoading={downloading === document.id} disabled={Boolean(downloading)} onClick={() => void download(document)}>Download</Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </MemberSectionCard>
    </div>
  );
}
