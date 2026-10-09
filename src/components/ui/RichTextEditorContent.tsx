import { useEffect, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import {
  FiBold,
  FiItalic,
  FiUnderline,
  FiList,
  FiLink,
  FiAlignLeft,
  FiAlignCenter,
  FiAlignRight,
  FiCornerUpLeft,
  FiCornerUpRight,
  FiX,
} from "react-icons/fi";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { agendaHtml } from "@/lib/meetingAgenda";
import { richTextClassName } from "./RichTextContent";

export default function RichTextEditorContent({
  value,
  onChange,
  label = "Agenda",
  disabled = false,
  placeholder = "Outline the items members will discuss...",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState("");
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        code: false,
        horizontalRule: false,
        link: {
          openOnClick: false,
          protocols: ["https", "http", "mailto"],
          HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
        },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
    ],
    content: agendaHtml(value),
    editable: !disabled,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": label,
        "aria-multiline": "true",
        class: `${richTextClassName} min-h-44 max-h-72 overflow-y-auto px-4 py-3 outline-none`,
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });
  const state = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor
        ? {
            bold: editor.isActive("bold"),
            italic: editor.isActive("italic"),
            underline: editor.isActive("underline"),
            strike: editor.isActive("strike"),
            bullet: editor.isActive("bulletList"),
            ordered: editor.isActive("orderedList"),
            quote: editor.isActive("blockquote"),
            link: editor.isActive("link"),
            heading: editor.isActive("heading", { level: 2 })
              ? "h2"
              : editor.isActive("heading", { level: 3 })
                ? "h3"
                : "p",
            left: editor.isActive({ textAlign: "left" }),
            center: editor.isActive({ textAlign: "center" }),
            right: editor.isActive({ textAlign: "right" }),
            undo: editor.can().undo(),
            redo: editor.can().redo(),
            words: editor.getText().trim().split(/\s+/).filter(Boolean).length,
          }
        : null,
  });
  useEffect(() => {
    if (editor && !editor.isFocused && editor.getHTML() !== agendaHtml(value))
      editor.commands.setContent(agendaHtml(value), { emitUpdate: false });
  }, [editor, value]);
  useEffect(() => {
    editor?.setEditable(!disabled, false);
  }, [editor, disabled]);
  if (!editor) return null;
  const tool = (
    title: string,
    icon: React.ReactNode,
    run: () => void,
    active = false,
    unavailable = false,
  ) => (
    <button
      key={title}
      type="button"
      aria-label={title}
      aria-pressed={active}
      title={title}
      disabled={disabled || unavailable}
      onMouseDown={(event) => event.preventDefault()}
      onClick={run}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-md text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-35 ${active ? "bg-brand-100 text-brand-800" : "text-slate-600 hover:bg-slate-200"}`}
    >
      {icon}
    </button>
  );
  const saveLink = () => {
    if (!link.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setLinkOpen(false);
      return;
    }
    try {
      const url = new URL(link.trim());
      if (!["https:", "http:", "mailto:"].includes(url.protocol))
        throw new Error();
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url.toString() })
        .run();
      setLinkOpen(false);
    } catch {
      setLinkError("Use a complete https://, http:// or mailto: link.");
    }
  };
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700">{label}</span>
        <span className="text-[0.7rem] text-slate-400">Formatted text</span>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white focus-within:border-brand-400 focus-within:ring-1 focus-within:ring-brand-100">
        <div
          role="toolbar"
          aria-label={`${label} formatting`}
          className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1.5"
        >
          <select
            aria-label="Text style"
            value={state?.heading ?? "p"}
            disabled={disabled}
            onChange={(event) =>
              event.target.value === "p"
                ? editor.chain().focus().setParagraph().run()
                : editor
                    .chain()
                    .focus()
                    .toggleHeading({
                      level: event.target.value === "h2" ? 2 : 3,
                    })
                    .run()
            }
            className="mr-1 h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
          >
            <option value="p">Normal text</option>
            <option value="h2">Heading</option>
            <option value="h3">Subheading</option>
          </select>
          {tool(
            "Bold",
            <FiBold />,
            () => editor.chain().focus().toggleBold().run(),
            state?.bold,
          )}
          {tool(
            "Italic",
            <FiItalic />,
            () => editor.chain().focus().toggleItalic().run(),
            state?.italic,
          )}
          {tool(
            "Underline",
            <FiUnderline />,
            () => editor.chain().focus().toggleUnderline().run(),
            state?.underline,
          )}
          {tool(
            "Strikethrough",
            <span className="line-through">S</span>,
            () => editor.chain().focus().toggleStrike().run(),
            state?.strike,
          )}
          <span className="mx-1 h-4 w-px bg-slate-200" />
          {tool(
            "Bullet list",
            <FiList />,
            () => editor.chain().focus().toggleBulletList().run(),
            state?.bullet,
          )}
          {tool(
            "Numbered list",
            <span>1.</span>,
            () => editor.chain().focus().toggleOrderedList().run(),
            state?.ordered,
          )}
          {tool(
            "Block quote",
            <span className="font-serif text-lg">&ldquo;</span>,
            () => editor.chain().focus().toggleBlockquote().run(),
            state?.quote,
          )}
          {tool(
            "Insert link",
            <FiLink />,
            () => {
              setLink(editor.getAttributes("link").href ?? "");
              setLinkError("");
              setLinkOpen(true);
            },
            state?.link,
          )}
          <span className="mx-1 h-4 w-px bg-slate-200" />
          {tool(
            "Align left",
            <FiAlignLeft />,
            () => editor.chain().focus().setTextAlign("left").run(),
            state?.left,
          )}
          {tool(
            "Align center",
            <FiAlignCenter />,
            () => editor.chain().focus().setTextAlign("center").run(),
            state?.center,
          )}
          {tool(
            "Align right",
            <FiAlignRight />,
            () => editor.chain().focus().setTextAlign("right").run(),
            state?.right,
          )}
          {tool("Clear formatting", <FiX />, () =>
            editor.chain().focus().clearNodes().unsetAllMarks().run(),
          )}
          {tool(
            "Undo",
            <FiCornerUpLeft />,
            () => editor.chain().focus().undo().run(),
            false,
            !state?.undo,
          )}
          {tool(
            "Redo",
            <FiCornerUpRight />,
            () => editor.chain().focus().redo().run(),
            false,
            !state?.redo,
          )}
        </div>
        <EditorContent editor={editor} />
        <div className="flex items-center justify-between border-t border-slate-100 px-3 py-1.5 text-[0.65rem] text-slate-400">
          <span>Formatting is included in member notices.</span>
          <span>{state?.words ?? 0} words</span>
        </div>
      </div>
      <Modal
        open={linkOpen}
        title="Add agenda link"
        onClose={() => setLinkOpen(false)}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setLinkOpen(false)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={saveLink}>
              Apply link
            </Button>
          </div>
        }
      >
        <label htmlFor="agenda-link" className="mb-1 block text-sm font-medium">
          Link address
        </label>
        <input
          id="agenda-link"
          type="url"
          value={link}
          onChange={(event) => setLink(event.target.value)}
          placeholder="https://example.com"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        {linkError ? (
          <p role="alert" className="mt-2 text-xs text-red-600">
            {linkError}
          </p>
        ) : (
          <p className="mt-2 text-xs text-slate-500">
            Leave blank to remove the selected link.
          </p>
        )}
      </Modal>
    </div>
  );
}
