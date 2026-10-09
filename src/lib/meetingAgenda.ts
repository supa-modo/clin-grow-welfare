import DOMPurify from "dompurify";

export const agendaTags = [
  "p",
  "br",
  "h2",
  "h3",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
];
export const richAgenda = (value: string) =>
  /<\/?(?:p|br|h[23]|strong|em|ul|ol|li|blockquote|a)\b/i.test(value);
const escapeText = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
export function agendaHtml(value: string) {
  const html = richAgenda(value)
    ? value
    : value
        .split(/\n\s*\n/)
        .map(
          (paragraph) =>
            `<p>${escapeText(paragraph).replace(/\n/g, "<br>")}</p>`,
        )
        .join("");
  const safe = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: agendaTags,
    ALLOWED_ATTR: ["href", "target", "rel", "style"],
    ALLOWED_URI_REGEXP: /^(https?:|mailto:)/i,
  });
  const document = new DOMParser().parseFromString(safe, "text/html");
  document.body.querySelectorAll("[style]").forEach((element) => {
    const align = (element as HTMLElement).style.textAlign;
    element.removeAttribute("style");
    if (["left", "center", "right", "justify"].includes(align))
      (element as HTMLElement).style.textAlign = align;
  });
  document.body.querySelectorAll("a").forEach((anchor) => {
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
  });
  return document.body.innerHTML;
}
export function agendaText(value?: string | null) {
  if (!value) return "";
  if (!richAgenda(value)) return value;
  return (
    new DOMParser()
      .parseFromString(
        agendaHtml(value).replace(/<\/(p|li|h2|h3|blockquote)>/gi, "</$1>\n"),
        "text/html",
      )
      .body.textContent?.trim() ?? ""
  );
}

export function meetingVirtualUrl(value?: string | null) {
  try {
    const url = new URL(value ?? "");
    return ["https:", "http:"].includes(url.protocol)
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}
