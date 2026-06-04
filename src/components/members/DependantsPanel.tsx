import { useEffect, useMemo, useState } from 'react';
import { FiCheckCircle, FiDownload, FiEdit3, FiFileText, FiPlus, FiShield, FiUploadCloud } from 'react-icons/fi';
import { Button } from '@/components/ui/Button';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { FileUpload } from '@/components/ui/FileUpload';
import Input from '@/components/ui/Input';
import { api } from '@/services/api';
import { memberApi, memberPortalApi } from '@/services/memberApi';
import { useUiStore } from '@/store/uiStore';
import type { MemberDependant, MemberDependantFormValues } from '@/types/member';

type DependantsPanelProps = {
  memberId?: string;
  scope: 'member' | 'admin';
  canVerify?: boolean;
};

const emptyForm: MemberDependantFormValues = {
  fullName: '',
  relationship: '',
  dateOfBirth: '',
  idNumber: '',
  phone: '',
  notes: '',
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function apiErrorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string; error?: string } } }).response;
    return response?.data?.message ?? response?.data?.error ?? 'Dependant action failed';
  }
  return 'Dependant action failed';
}

function toForm(dependant: MemberDependant): MemberDependantFormValues {
  return {
    fullName: dependant.fullName,
    relationship: dependant.relationship,
    dateOfBirth: dependant.dateOfBirth?.slice(0, 10) ?? '',
    idNumber: dependant.idNumber ?? '',
    phone: dependant.phone ?? '',
    notes: dependant.notes ?? '',
  };
}

export function DependantsPanel({ memberId, scope, canVerify = false }: DependantsPanelProps) {
  const toastSuccess = useUiStore((s) => s.toastSuccess);
  const [dependants, setDependants] = useState<MemberDependant[]>([]);
  const [form, setForm] = useState<MemberDependantFormValues>(emptyForm);
  const [editing, setEditing] = useState<MemberDependant | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const canUseAdminApi = scope === 'admin' && Boolean(memberId);
  const title = scope === 'admin' ? 'Dependants' : 'My Dependants';

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const rows = canUseAdminApi ? await memberApi.dependants(memberId!) : await memberPortalApi.dependants();
      setDependants(rows);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [memberId, scope]);

  const isValid = useMemo(() => form.fullName.trim().length >= 2 && form.relationship.trim().length >= 2, [form]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
    setOpen(false);
  };

  const save = async () => {
    if (!isValid) return;
    setBusy('save');
    setError('');
    try {
      if (editing) {
        await (canUseAdminApi ? memberApi.updateDependant(memberId!, editing.id, form) : memberPortalApi.updateDependant(editing.id, form));
      } else {
        await (canUseAdminApi ? memberApi.createDependant(memberId!, form) : memberPortalApi.createDependant(form));
      }
      resetForm();
      await load();
      if (scope === 'member') {
        toastSuccess(
          editing ? 'Dependant updated' : 'Dependant added',
          'Your submission is pending official verification of details and documents.',
        );
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const upload = async (dependant: MemberDependant, files: FileList) => {
    const file = files[0];
    if (!file) return;
    setBusy(`upload:${dependant.id}`);
    setError('');
    try {
      await (canUseAdminApi ? memberApi.uploadDependantDocument(memberId!, dependant.id, file) : memberPortalApi.uploadDependantDocument(dependant.id, file));
      await load();
      if (scope === 'member') {
        toastSuccess('Document uploaded', 'Officials will re-review this dependant before verification.');
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const verify = async (dependant: MemberDependant) => {
    if (!canUseAdminApi) return;
    setBusy(`verify:${dependant.id}`);
    setError('');
    try {
      await memberApi.verifyDependant(memberId!, dependant.id);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const download = async (dependant: MemberDependant, documentId: string, fileName: string) => {
    const endpoint = canUseAdminApi ? memberApi.dependantDocumentUrl(memberId!, dependant.id, documentId) : memberPortalApi.dependantDocumentUrl(dependant.id, documentId);
    const response = await api.get(endpoint, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-3xl border border-ink-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><FiShield /></span>
            <div>
              <h2 className="text-base font-black text-ink-900">{title}</h2>
              <p className="text-sm text-ink-500">Capture dependant details and attach proof documents.</p>
            </div>
          </div>
        </div>
        <Button type="button" size="sm" icon={<FiPlus />} onClick={() => { setForm(emptyForm); setEditing(null); setOpen((value) => !value); }}>
          Add dependant
        </Button>
      </div>

      {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div> : null}

      {open ? (
        <div className="mt-4 rounded-2xl border border-ink-100 bg-ink-50 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Full name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required />
            <Input label="Relationship" value={form.relationship} onChange={(event) => setForm({ ...form, relationship: event.target.value })} required />
            <Input label="Date of birth" type="date" value={form.dateOfBirth} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} />
            <Input label="ID / birth certificate number" value={form.idNumber} onChange={(event) => setForm({ ...form, idNumber: event.target.value })} />
            <Input label="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            <Input label="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>
            <Button type="button" onClick={save} disabled={!isValid || busy === 'save'} isLoading={busy === 'save'} loadingText="Saving...">
              {editing ? 'Update dependant' : 'Save dependant'}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        {loading ? (
          <div className="grid min-h-40 place-items-center"><div className="flex items-center gap-3 text-sm font-bold text-ink-600"><Spinner /> Loading dependants...</div></div>
        ) : dependants.length ? (
          <div className="grid gap-4">
            {dependants.map((dependant) => (
              <div key={dependant.id} className="rounded-2xl border border-ink-100 bg-white p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-ink-900">{dependant.fullName}</h3>
                      {dependant.verifiedAt ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700"><FiCheckCircle /> Verified</span>
                      ) : (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">Pending verification</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-ink-500">{dependant.relationship}</p>
                    <div className="mt-3 grid gap-2 text-xs text-ink-600 sm:grid-cols-3">
                      <span>DOB: {formatDate(dependant.dateOfBirth)}</span>
                      <span>ID: {dependant.idNumber || '-'}</span>
                      <span>Phone: {dependant.phone || '-'}</span>
                    </div>
                    {dependant.notes ? <p className="mt-2 text-sm text-ink-500">{dependant.notes}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" size="sm" icon={<FiEdit3 />} onClick={() => { setEditing(dependant); setForm(toForm(dependant)); setOpen(true); }}>Edit</Button>
                    {canVerify ? (
                      <Button type="button" size="sm" icon={<FiCheckCircle />} disabled={Boolean(dependant.verifiedAt) || !dependant.documents?.length || busy === `verify:${dependant.id}`} onClick={() => verify(dependant)}>
                        Mark verified
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1.2fr]">
                  <FileUpload accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*" disabled={busy === `upload:${dependant.id}`} onFiles={(files) => upload(dependant, files)} />
                  <div className="rounded-xl border border-ink-100 bg-ink-50 p-3">
                    <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-ink-400">Proof documents</p>
                    <div className="mt-2 space-y-2">
                      {dependant.documents?.length ? dependant.documents.map((document) => (
                        <button
                          key={document.id}
                          type="button"
                          onClick={() => download(dependant, document.id, document.fileName)}
                          className="flex w-full items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-left text-sm font-semibold text-ink-700 transition hover:bg-brand-50"
                        >
                          <span className="inline-flex min-w-0 items-center gap-2"><FiFileText className="shrink-0 text-brand-700" /><span className="truncate">{document.fileName}</span></span>
                          <FiDownload className="shrink-0" />
                        </button>
                      )) : <p className="rounded-lg bg-white px-3 py-4 text-center text-sm font-semibold text-ink-500">No proof uploaded yet.</p>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No dependants captured" message="Add dependant details and upload proof documents for official verification." />
        )}
      </div>
    </section>
  );
}
