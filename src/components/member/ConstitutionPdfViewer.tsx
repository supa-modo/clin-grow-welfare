import { useEffect, useRef, useState, type RefObject } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.mjs?url";
import { Spinner } from "@/components/ui/Feedback";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

type ConstitutionPdfViewerProps = {
  pdfBytes: ArrayBuffer;
  documentName?: string;
};

type PageRenderState = {
  pageNumber: number;
  height: number;
  ready: boolean;
};

function copyPdfBytes(pdfBytes: ArrayBuffer) {
  return pdfBytes.slice(0);
}

async function waitForCanvas(
  canvasRefs: RefObject<Map<number, HTMLCanvasElement>>,
  pageNumber: number,
) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const canvas = canvasRefs.current.get(pageNumber);
    if (canvas) return canvas;
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }
  return null;
}

export function ConstitutionPdfViewer({
  pdfBytes,
  documentName = "Clin-Grow constitution",
}: ConstitutionPdfViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const renderTasksRef = useRef<Map<number, pdfjsLib.RenderTask>>(new Map());
  const pdfDocumentRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const [containerWidth, setContainerWidth] = useState(0);
  const [numPages, setNumPages] = useState(0);
  const [pageStates, setPageStates] = useState<PageRenderState[]>([]);
  const [loading, setLoading] = useState(true);
  const [useNativePreview, setUseNativePreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const objectUrl = URL.createObjectURL(blob);
    previewUrlRef.current = objectUrl;
    setPreviewUrl(objectUrl);

    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, [pdfBytes]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => {
      const nextWidth = Math.max(container.clientWidth - 32, 280);
      setContainerWidth(nextWidth);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);
    return () => observer.disconnect();
  }, [useNativePreview]);

  useEffect(() => {
    if (useNativePreview || containerWidth <= 0) return;

    let cancelled = false;

    async function loadAndRender() {
      setLoading(true);
      renderTasksRef.current.forEach((task) => task.cancel());
      renderTasksRef.current.clear();

      if (pdfDocumentRef.current) {
        await pdfDocumentRef.current.cleanup();
        pdfDocumentRef.current = null;
      }

      try {
        const document = await pdfjsLib
          .getDocument({ data: copyPdfBytes(pdfBytes) })
          .promise;
        if (cancelled) {
          await document.cleanup();
          return;
        }

        pdfDocumentRef.current = document;
        const totalPages = document.numPages;
        setNumPages(totalPages);
        setPageStates(
          Array.from({ length: totalPages }, (_, index) => ({
            pageNumber: index + 1,
            height: Math.round(containerWidth * 1.414),
            ready: false,
          })),
        );

        for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
          if (cancelled) return;

          const page = await document.getPage(pageNumber);
          if (cancelled) return;

          const baseViewport = page.getViewport({ scale: 1 });
          const scale = containerWidth / baseViewport.width;
          const viewport = page.getViewport({ scale });
          const pixelRatio = window.devicePixelRatio || 1;

          setPageStates((current) =>
            current.map((state) =>
              state.pageNumber === pageNumber
                ? { ...state, height: Math.ceil(viewport.height) + 16 }
                : state,
            ),
          );

          const canvas = await waitForCanvas(canvasRefs, pageNumber);
          if (!canvas || cancelled) continue;

          const context = canvas.getContext("2d");
          if (!context) continue;

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
          renderTasksRef.current.set(pageNumber, renderTask);

          try {
            await renderTask.promise;
            if (cancelled) return;
            setPageStates((current) =>
              current.map((state) =>
                state.pageNumber === pageNumber
                  ? { ...state, ready: true }
                  : state,
              ),
            );
            if (pageNumber === 1) setLoading(false);
          } catch (renderError) {
            if (
              renderError instanceof Error &&
              renderError.name === "RenderingCancelledException"
            ) {
              return;
            }
            throw renderError;
          }
        }

        if (!cancelled) setLoading(false);
      } catch {
        if (!cancelled) {
          setUseNativePreview(true);
          setLoading(false);
        }
      }
    }

    void loadAndRender();

    return () => {
      cancelled = true;
      renderTasksRef.current.forEach((task) => task.cancel());
      renderTasksRef.current.clear();
      if (pdfDocumentRef.current) {
        void pdfDocumentRef.current.cleanup();
        pdfDocumentRef.current = null;
      }
    };
  }, [containerWidth, pdfBytes, useNativePreview]);

  if (useNativePreview && previewUrl) {
    return (
      <div
        ref={containerRef}
        className="h-[75vh] min-h-112 overflow-hidden bg-white"
      >
        <iframe
          title={documentName}
          src={previewUrl}
          className="h-full w-full border-0 bg-white"
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-[75vh] min-h-112 overflow-y-auto bg-slate-100 p-4"
    >
      {loading ? (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-10 mx-auto flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-extrabold text-ink-700 shadow-sm">
          <Spinner /> Loading constitution...
        </div>
      ) : null}

      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4">
        {pageStates.map((state) => (
          <div
            key={state.pageNumber}
            className="relative w-full rounded-lg border border-gray-200 bg-white shadow-sm"
            style={{ minHeight: state.height }}
          >
            {!state.ready ? (
              <div className="absolute inset-0 grid place-items-center text-xs font-semibold text-gray-400">
                <Spinner />
              </div>
            ) : null}
            <canvas
              ref={(node) => {
                if (node) canvasRefs.current.set(state.pageNumber, node);
                else canvasRefs.current.delete(state.pageNumber);
              }}
              className="mx-auto block"
              aria-label={`${documentName} page ${state.pageNumber}`}
            />
          </div>
        ))}
      </div>

      {!loading && numPages > 0 ? (
        <p className="sticky bottom-2 mx-auto mt-4 w-fit rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-ink-600 shadow-sm">
          {numPages} {numPages === 1 ? "page" : "pages"} — scroll to read
        </p>
      ) : null}
    </div>
  );
}
