import { agendaHtml } from "@/lib/meetingAgenda";
export const richTextClassName =
  "text-sm leading-6 text-slate-700 [&_p]:my-2 [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_a]:text-brand-700 [&_a]:underline";
export function RichTextContent({
  value,
  className = "",
}: {
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`${richTextClassName} ${className}`}
      dangerouslySetInnerHTML={{ __html: agendaHtml(value) }}
    />
  );
}
