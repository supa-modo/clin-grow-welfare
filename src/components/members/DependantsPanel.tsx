import { useEffect, useMemo, useState } from "react";
import {
  FiCheckCircle,
  FiDownload,
  FiEdit3,
  FiFileText,
  FiPlus,
  FiShield,
} from "react-icons/fi";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";
import { EmptyState, Spinner } from "@/components/ui/Feedback";
import { FileUpload } from "@/components/ui/FileUpload";
import Input from "@/components/ui/Input";
import { api } from "@/services/api";
import { memberApi, memberPortalApi } from "@/services/memberApi";
import { useUiStore } from "@/store/uiStore";
import type {
  MemberDependant,
  MemberDependantFormValues,
} from "@/types/member";

type DependantsPanelProps = {
  memberId?: string;
  scope: "member" | "admin";
  canVerify?: boolean;
  /** When true, omits outer card chrome for use inside another panel. */
  embedded?: boolean;
};

const emptyForm: MemberDependantFormValues = {
  fullName: "",
  relationship: "",
  dateOfBirth: "",
  idNumber: "",
  phone: "",
  notes: "",
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function apiErrorMessage(error: unknown) {
  if (typeof error === "object" && error && "response" in error) {
    const response = (
      error as { response?: { data?: { message?: string; error?: string } } }
    ).response;
    return (
      response?.data?.message ??
      response?.data?.error ??
      "Dependant action failed"
    );
  }
  return "Dependant action failed";
}

function toForm(dependant: MemberDependant): MemberDependantFormValues {
  return {
    fullName: dependant.fullName,
    relationship: dependant.relationship,
    dateOfBirth: dependant.dateOfBirth?.slice(0, 10) ?? "",
    idNumber: dependant.idNumber ?? "",
    phone: dependant.phone ?? "",
    notes: dependant.notes ?? "",
  };
}

function DocumentLink({
  fileName,
  onClick,
}: {
  fileName: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full min-w-0 items-center gap-2 rounded-lg bg-white px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-primary-50"
      title={fileName}
    >
      <FiFileText className="h-4 w-4 shrink-0 text-primary-700" />
      <span className="min-w-0 flex-1 wrap-break-word">{fileName}</span>
      <FiDownload className="h-4 w-4 shrink-0 text-slate-500" />
    </button>
  );
}

export function DependantsPanel({
  memberId,
  scope,
  canVerify = false,
  embedded = false,
}: DependantsPanelProps) {
  const toastSuccess = useUiStore((s) => s.toastSuccess);
  const [dependants, setDependants] = useState<MemberDependant[]>([]);
  const [form, setForm] = useState<MemberDependantFormValues>(emptyForm);
  const [editing, setEditing] = useState<MemberDependant | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const canUseAdminApi = scope === "admin" && Boolean(memberId);
  const title = scope === "admin" ? "Dependants" : "Dependants";

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const rows = canUseAdminApi
        ? await memberApi.dependants(memberId!)
        : await memberPortalApi.dependants();
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

  const isValid = useMemo(
    () =>
      form.fullName.trim().length >= 2 && form.relationship.trim().length >= 2,
    [form],
  );

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
    setOpen(false);
  };

  const save = async () => {
    if (!isValid) return;
    setBusy("save");
    setError("");
    try {
      if (editing) {
        await (canUseAdminApi
          ? memberApi.updateDependant(memberId!, editing.id, form)
          : memberPortalApi.updateDependant(editing.id, form));
      } else {
        await (canUseAdminApi
          ? memberApi.createDependant(memberId!, form)
          : memberPortalApi.createDependant(form));
      }
      resetForm();
      await load();
      if (scope === "member") {
        toastSuccess(
          editing ? "Dependant updated" : "Dependant added",
          "Your submission is pending official verification of details and documents.",
        );
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy("");
    }
  };

  const upload = async (dependant: MemberDependant, files: FileList) => {
    const file = files[0];
    if (!file) return;
    setBusy(`upload:${dependant.id}`);
    setError("");
    try {
      await (canUseAdminApi
        ? memberApi.uploadDependantDocument(memberId!, dependant.id, file)
        : memberPortalApi.uploadDependantDocument(dependant.id, file));
      await load();
      if (scope === "member") {
        toastSuccess(
          "Document uploaded",
          "Officials will re-review this dependant before verification.",
        );
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy("");
    }
  };

  const verify = async (dependant: MemberDependant) => {
    if (!canUseAdminApi) return;
    setBusy(`verify:${dependant.id}`);
    setError("");
    try {
      await memberApi.verifyDependant(memberId!, dependant.id);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy("");
    }
  };

  const download = async (
    dependant: MemberDependant,
    documentId: string,
    fileName: string,
  ) => {
    const endpoint = canUseAdminApi
      ? memberApi.dependantDocumentUrl(memberId!, dependant.id, documentId)
      : memberPortalApi.dependantDocumentUrl(dependant.id, documentId);
    const response = await api.get(endpoint, { responseType: "blob" });
    const url = URL.createObjectURL(response.data);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section
      className={clsx(
        embedded
          ? "overflow-hidden"
          : "overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm",
      )}
    >
      <div
        className={clsx(
          "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
          embedded
            ? "border-b border-slate-100 bg-slate-50/80 py-3.5"
            : "border-b border-slate-100 bg-slate-50/80 py-4",
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className="min-w-0 flex gap-3">
            <h2 className="text-sm font-extrabold text-gray-700">{title}</h2>
            <div className="h-4 w-px bg-slate-400" />
            <p className="text-xs md:text-sm text-slate-500">
              Capture dependant details and attach proof documents.
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          className="w-full shrink-0 sm:w-auto text-[0.7rem] md:text-xs"
          icon={<FiPlus />}
          onClick={() => {
            setForm(emptyForm);
            setEditing(null);
            setOpen((value) => !value);
          }}
        >
          Add dependant
        </Button>
      </div>

      <div className="">
        {error ? (
          <div className="mb-4 rounded-[1.2rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        {open ? (
          <div className="mb-4 rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="Full name"
                value={form.fullName}
                onChange={(event) =>
                  setForm({ ...form, fullName: event.target.value })
                }
                required
              />
              <Input
                label="Relationship"
                value={form.relationship}
                onChange={(event) =>
                  setForm({ ...form, relationship: event.target.value })
                }
                required
              />
              <Input
                label="Date of birth"
                type="date"
                value={form.dateOfBirth}
                onChange={(event) =>
                  setForm({ ...form, dateOfBirth: event.target.value })
                }
              />
              <Input
                label="ID / birth certificate number"
                value={form.idNumber}
                onChange={(event) =>
                  setForm({ ...form, idNumber: event.target.value })
                }
              />
              <Input
                label="Phone"
                value={form.phone}
                onChange={(event) =>
                  setForm({ ...form, phone: event.target.value })
                }
              />
              <Input
                label="Notes"
                value={form.notes}
                onChange={(event) =>
                  setForm({ ...form, notes: event.target.value })
                }
              />
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={resetForm}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void save()}
                disabled={!isValid || busy === "save"}
                isLoading={busy === "save"}
                loadingText="Saving..."
              >
                {editing ? "Update dependant" : "Save dependant"}
              </Button>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="grid min-h-32 place-items-center">
            <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
              <Spinner /> Loading dependants...
            </div>
          </div>
        ) : dependants.length ? (
          <div className="grid gap-4">
            {dependants.map((dependant) => (
              <div
                key={dependant.id}
                className="overflow-hidden rounded-[1.2rem] border border-slate-200 bg-white"
              >
                <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className="min-w-0 wrap-break-word text-sm font-extrabold text-slate-950"
                        title={dependant.fullName}
                      >
                        {dependant.fullName}
                      </h3>
                      {dependant.verifiedAt ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                          <FiCheckCircle className="h-3.5 w-3.5" /> Verified
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-lg border border-amber-600/80 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                          Pending verification
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {dependant.relationship}
                    </p>
                    {dependant.verifiedAt ? (
                      <p className="mt-1 text-xs font-semibold text-emerald-700">
                        Verified by {dependant.verifiedByName ?? dependant.verifiedByUser?.name ?? "official"} on {formatDate(dependant.verifiedAt)}
                      </p>
                    ) : null}
                    <div className="mt-3 grid gap-2 text-xs text-slate-600 grid-cols-2 lg:grid-cols-3">
                      <span className="min-w-0 wrap-break-word">
                        DOB: {formatDate(dependant.dateOfBirth)}
                      </span>
                      <span className="min-w-0 wrap-break-word">
                        ID: {dependant.idNumber || "—"}
                      </span>
                      <span className="min-w-0 wrap-break-word sm:col-span-2 lg:col-span-1">
                        Phone: {dependant.phone || "—"}
                      </span>
                    </div>
                    {dependant.notes ? (
                      <p className="mt-2 wrap-break-word text-sm text-slate-500">
                        {dependant.notes}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="xs"
                      className="w-full py-[0.4rem] lg:py-1.5 text-[0.73rem] lg:text-xs"
                      icon={<FiEdit3 className="h-4 w-4" />}
                      onClick={() => {
                        setEditing(dependant);
                        setForm(toForm(dependant));
                        setOpen(true);
                      }}
                    >
                      Update Details
                    </Button>
                    {canVerify ? (
                      <Button
                        type="button"
                        size="sm"
                        icon={<FiCheckCircle />}
                        disabled={
                          Boolean(dependant.verifiedAt) ||
                          !dependant.documents?.length ||
                          busy === `verify:${dependant.id}`
                        }
                        onClick={() => void verify(dependant)}
                      >
                        Mark verified
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3 p-4 lg:grid-cols-2">
                  <FileUpload
                    accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                    disabled={busy === `upload:${dependant.id}`}
                    onFiles={(files) => void upload(dependant, files)}
                  />
                  <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[0.75rem] font-semibold lg:text-[0.8rem] text-slate-500">
                      Proof documents
                    </p>
                    <div className="mt-2 space-y-2">
                      {dependant.documents?.length ? (
                        dependant.documents.map((document) => (
                          <DocumentLink
                            key={document.id}
                            fileName={document.fileName}
                            onClick={() =>
                              void download(
                                dependant,
                                document.id,
                                document.fileName,
                              )
                            }
                          />
                        ))
                      ) : (
                        <p className="rounded-lg bg-white px-3 py-4 text-center text-sm text-slate-500">
                          No proof uploaded yet.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No dependants captured"
            message="Add dependant details and upload proof documents for official verification."
          />
        )}
      </div>
    </section>
  );
}
