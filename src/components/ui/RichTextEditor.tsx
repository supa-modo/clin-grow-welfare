import { lazy, Suspense } from "react";
const Editor = lazy(() => import("./RichTextEditorContent"));
export function RichTextEditor(props: { value: string; onChange: (value: string) => void; label?: string; disabled?: boolean; placeholder?: string }) {
  return <Suspense fallback={<div className="min-h-48 rounded-lg border border-slate-200 p-4 text-sm text-slate-500">Loading agenda editor...</div>}><Editor {...props} /></Suspense>;
}
