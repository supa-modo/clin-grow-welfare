import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiFileText,
  FiShield,
  FiZoomIn,
  FiZoomOut,
} from "react-icons/fi";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.mjs?url";
import Checkbox from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Feedback";
import { MemberSection } from "@/components/member/MemberCards";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { TbArrowRight, TbClipboardCheck, TbDownload } from "react-icons/tb";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

type ConstitutionStatus = {
  accepted: boolean;
  acceptedAt: string | null;
  documentName: string;
};

function sameOriginApiUrl(path: string) {
  return `/api${path}`;
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
  return "Unable to update constitution acknowledgement";
}

export function MemberConstitutionPage() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const [status, setStatus] = useState<ConstitutionStatus | null>(null);
  const [pdfDocument, setPdfDocument] =
    useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [renderingPage, setRenderingPage] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadConstitution() {
      setLoading(true);
      setError("");
      try {
        const [statusRes, fileRes] = await Promise.all([
          api.get<ConstitutionStatus>("/member-portal/constitution"),
          fetch(sameOriginApiUrl("/member-portal/constitution/preview"), {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }).then((response) => {
            if (!response.ok)
              throw new Error("Unable to load constitution PDF");
            return response.arrayBuffer();
          }),
        ]);
        if (cancelled) return;
        const document = await pdfjsLib.getDocument({ data: fileRes }).promise;
        if (cancelled) {
          await document.cleanup();
          return;
        }
        setPdfDocument(document);
        setPageNumber(1);
        setStatus(statusRes.data);
        if (statusRes.data.accepted && token && user) {
          setAuth(token, {
            ...user,
            memberConstitutionAccepted: true,
            memberConstitutionAcceptedAt: statusRes.data.acceptedAt,
          });
          navigate("/member", { replace: true });
        }
      } catch (loadError) {
        if (!cancelled) setError(apiErrorMessage(loadError));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadConstitution();
    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      setPdfDocument((document) => {
        void document?.cleanup();
        return null;
      });
    };
  }, [navigate, setAuth, token, user]);

  const downloadConstitution = async () => {
    if (!token) return;
    setError("");
    try {
      const response = await fetch(
        sameOriginApiUrl("/member-portal/constitution/download"),
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) throw new Error("Unable to download constitution PDF");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = status?.documentName ?? "clin-grow-constitution.pdf";
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setError("Unable to download the constitution PDF.");
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function renderPage() {
      if (!pdfDocument || !canvasRef.current) return;
      setRenderingPage(true);
      try {
        renderTaskRef.current?.cancel();
        const page = await pdfDocument.getPage(pageNumber);
        if (cancelled || !canvasRef.current) return;
        const viewport = page.getViewport({ scale: zoom });
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        if (!context) return;

        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        context.clearRect(0, 0, viewport.width, viewport.height);

        const renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
        });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (renderError) {
        if (
          !cancelled &&
          !(
            renderError instanceof Error &&
            renderError.name === "RenderingCancelledException"
          )
        ) {
          setError("Unable to render the constitution preview.");
        }
      } finally {
        if (!cancelled) setRenderingPage(false);
      }
    }

    void renderPage();
    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [pdfDocument, pageNumber, zoom]);

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
        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-[0.8rem] lg:text-sm font-extrabold text-ink-900">
            {status?.documentName ?? "Clin-Grow constitution"}
          </div>
          {pdfDocument ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="xs"
                variant="secondary"
                icon={<FiChevronLeft />}
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber((page) => Math.max(1, page - 1))}
              >
                Previous
              </Button>
              <span className="rounded-lg border border-ink-100 bg-ink-50 px-3 py-1.5 text-xs font-extrabold text-ink-700">
                Page {pageNumber} of {pdfDocument.numPages}
              </span>
              <Button
                type="button"
                size="xs"
                variant="secondary"
                icon={<FiChevronRight />}
                disabled={pageNumber >= pdfDocument.numPages}
                onClick={() =>
                  setPageNumber((page) =>
                    Math.min(pdfDocument.numPages, page + 1),
                  )
                }
              >
                Next
              </Button>
              <Button
                type="button"
                size="xs"
                variant="secondary"
                icon={<FiZoomOut />}
                disabled={zoom <= 0.75}
                onClick={() => setZoom((value) => Math.max(0.75, value - 0.25))}
              >
                Zoom out
              </Button>
              <span className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-extrabold text-ink-700">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                type="button"
                size="xs"
                variant="secondary"
                icon={<FiZoomIn />}
                disabled={zoom >= 1.75}
                onClick={() => setZoom((value) => Math.min(1.75, value + 0.25))}
              >
                Zoom in
              </Button>
            </div>
          ) : null}
        </div>
        {loading ? (
          <div className="grid min-h-112 place-items-center">
            <div className="flex items-center gap-3 text-[0.8rem] lg:text-sm text-gray-500">
              <Spinner /> Loading constitution...
            </div>
          </div>
        ) : (
          <div className="relative min-h-112 max-h-168 overflow-auto bg-white p-4">
            {renderingPage ? (
              <div className="pointer-events-none absolute inset-x-0 top-4 z-10 mx-auto flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-extrabold text-ink-700 shadow-sm">
                <Spinner /> Rendering page
              </div>
            ) : null}
            <canvas ref={canvasRef} className="mx-auto block bg-white" />
          </div>
        )}
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
