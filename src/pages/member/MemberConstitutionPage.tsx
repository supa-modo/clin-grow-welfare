import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Checkbox from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Feedback";
import { ConstitutionPdfViewer } from "@/components/member/ConstitutionPdfViewer";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { TbArrowRight, TbClipboardCheck, TbDownload } from "react-icons/tb";

type ConstitutionStatus = {
  accepted: boolean;
  acceptedAt: string | null;
  documentName: string;
};

function isPdfBytes(data: ArrayBuffer) {
  if (data.byteLength < 5) return false;
  const header = new Uint8Array(data, 0, 5);
  return (
    header[0] === 0x25 &&
    header[1] === 0x50 &&
    header[2] === 0x44 &&
    header[3] === 0x46 &&
    header[4] === 0x2d
  );
}

function sanitizeDownloadName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "clin-grow-constitution.pdf";
  return trimmed.toLowerCase().endsWith(".pdf") ? trimmed : `${trimmed}.pdf`;
}

function apiErrorMessage(error: unknown) {
  if (typeof error === "object" && error && "response" in error) {
    const response = (
      error as { response?: { data?: { message?: string; error?: string } } }
    ).response;
    return (
      response?.data?.message ??
      response?.data?.error ??
      "Unable to update constitution acknowledgement"
    );
  }
  if (error instanceof Error && error.message) return error.message;
  return "Unable to update constitution acknowledgement";
}

async function fetchConstitutionPdf(signal?: AbortSignal) {
  const response = await api.get<ArrayBuffer>(
    "/member-portal/constitution/preview",
    { responseType: "arraybuffer", signal },
  );
  const data = response.data;
  if (!isPdfBytes(data)) {
    throw new Error(
      "The constitution document could not be loaded. Please try again or contact support.",
    );
  }
  return data;
}

export function MemberConstitutionPage() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const [status, setStatus] = useState<ConstitutionStatus | null>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();
    let cancelled = false;

    async function loadConstitution() {
      setLoading(true);
      setError("");
      try {
        const [statusRes, fetchedPdfBytes] = await Promise.all([
          api.get<ConstitutionStatus>("/member-portal/constitution", {
            signal: controller.signal,
          }),
          fetchConstitutionPdf(controller.signal),
        ]);
        if (cancelled) return;

        setPdfBytes(fetchedPdfBytes.slice(0));
        setStatus(statusRes.data);

        if (statusRes.data.accepted) {
          const currentToken = useAuthStore.getState().token;
          const currentUser = useAuthStore.getState().user;
          if (currentToken && currentUser) {
            setAuth(currentToken, {
              ...currentUser,
              memberConstitutionAccepted: true,
              memberConstitutionAcceptedAt: statusRes.data.acceptedAt,
            });
          }
          navigate("/member", { replace: true });
        }
      } catch (loadError) {
        if (cancelled || controller.signal.aborted) return;
        setError(apiErrorMessage(loadError));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadConstitution();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [token, navigate, setAuth]);

  const downloadConstitution = async () => {
    setError("");
    try {
      const response = await api.get<ArrayBuffer>(
        "/member-portal/constitution/download",
        { responseType: "arraybuffer" },
      );
      const data = response.data;
      if (!isPdfBytes(data)) {
        throw new Error("Downloaded file is not a valid PDF.");
      }
      const blob = new Blob([data], { type: "application/pdf" });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = sanitizeDownloadName(
        status?.documentName ?? "clin-grow-constitution.pdf",
      );
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Unable to download the constitution PDF.",
      );
    }
  };

  const acknowledge = async () => {
    if (!accepted || submitting || !token || !user) return;
    setSubmitting(true);
    setError("");
    try {
      const { data } = await api.post(
        "/member-portal/constitution/acknowledge",
        { accepted: true },
      );
      setAuth(token, {
        ...user,
        memberConstitutionAccepted: true,
        memberConstitutionAcceptedAt: data.member.constitutionAcceptedAt,
      });
      navigate("/member", { replace: true });
    } catch (submitError) {
      setError(apiErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="border-b border-slate-200 pb-6">
        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <h1 className=" text-base font-extrabold text-primary-700 md:text-lg">
              Accept the Clin-Grow constitution and bylaws to continue
            </h1>
            <p className="mt-2 text-[0.8rem] lg:text-sm leading-relaxed text-gray-500">
              Review the constitution below, then confirm that you have read,
              understood, and agree to follow the group constitution and bylaws.
            </p>
          </div>
          {!loading ? (
            <Button
              type="button"
              size="sm"
              variant="secondary2"
              icon={<TbDownload className="w-4 h-4" />}
              onClick={() => void downloadConstitution()}
            >
              Download Welfare Constitution
            </Button>
          ) : null}
        </div>
      </section>

      {error ? (
        <div className=" text-[0.8rem] lg:text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <div className="text-[0.8rem] lg:text-sm font-extrabold text-ink-900">
            {status?.documentName ?? "Clin-Grow constitution"}
          </div>
        </div>
        {loading ? (
          <div className="grid min-h-[28rem] place-items-center">
            <div className="flex items-center gap-3 text-[0.8rem] lg:text-sm text-gray-500">
              <Spinner /> Loading constitution...
            </div>
          </div>
        ) : pdfBytes ? (
          <ConstitutionPdfViewer
            pdfBytes={pdfBytes}
            documentName={status?.documentName}
          />
        ) : null}
      </section>

      <section className="px-2 ">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Checkbox
            checked={accepted}
            onChange={setAccepted}
            label="I have read, understood, and accept the Clin-Grow constitution and bylaws."
            className="items-start"
            size="md"
          />
          <Button
            type="button"
            onClick={acknowledge}
            disabled={!accepted || submitting}
            icon={
              submitting ? (
                <Spinner />
              ) : (
                <TbClipboardCheck className="h-4 lg:h-5 w-4 lg:w-5" />
              )
            }
          >
            <div className="flex items-center gap-2">
              <span className="">Accept and continue</span>

              <TbArrowRight className="h-4 w-4" />
            </div>
          </Button>
        </div>
      </section>
    </div>
  );
}
