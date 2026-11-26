import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Simple text formatting for blog posts and the About page:
 * blank line = new paragraph, "## " = heading, "### " = sub-heading,
 * "- " = bullet list, "1. " = numbered list, "> " = tip box,
 * **bold**, and [link text](/shop?category=jeans) for links.
 */

export function headingId(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) {
      const href = m[2];
      const internal = href.startsWith("/");
      out.push(
        internal ? (
          <Link key={`${keyBase}-${i++}`} href={href} className="font-medium text-brass underline decoration-brass/40 underline-offset-4 hover:decoration-brass">
            {m[1]}
          </Link>
        ) : (
          <a key={`${keyBase}-${i++}`} href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-brass underline decoration-brass/40 underline-offset-4">
            {m[1]}
          </a>
        )
      );
    } else if (m[3]) {
      out.push(<strong key={`${keyBase}-${i++}`} className="font-semibold text-ink">{m[3]}</strong>);
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function RichText({ text }: { text: string }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="space-y-5 text-base leading-relaxed text-neutral-700 sm:text-[17px]">
      {blocks.map((block, i) => {
        const k = String(i);
        if (block.startsWith("### ")) {
          const t = block.slice(4);
          return (
            <h3 key={k} id={headingId(t)} className="scroll-mt-28 pt-1 text-lg font-bold text-ink">
              {t}
            </h3>
          );
        }
        if (block.startsWith("## ")) {
          const t = block.slice(3);
          return (
            <h2 key={k} id={headingId(t)} className="scroll-mt-28 pt-3 font-display text-2xl font-bold text-ink sm:text-3xl">
              {t}
            </h2>
          );
        }
        const lines = block.split("\n");
        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <ul key={k} className="list-disc space-y-1.5 pl-6 marker:text-brass">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.slice(2), `${k}-${j}`)}</li>
              ))}
            </ul>
          );
        }
        if (lines.every((l) => /^\d+\.\s/.test(l))) {
          return (
            <ol key={k} className="list-decimal space-y-1.5 pl-6 marker:font-semibold marker:text-brass">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\d+\.\s/, ""), `${k}-${j}`)}</li>
              ))}
            </ol>
          );
        }
        if (lines.every((l) => l.startsWith("> "))) {
          return (
            <p key={k} className="rounded-2xl border-l-4 border-amber bg-amber/10 px-5 py-4 text-ink">
              {inline(lines.map((l) => l.slice(2)).join(" "), k)}
            </p>
          );
        }
        return (
          <p key={k} className="whitespace-pre-line">
            {inline(block, k)}
          </p>
        );
      })}
    </div>
  );
}

/** Pulls "### Question" + answer pairs from a "## Frequently asked questions" section, for FAQ rich results. */
export function extractFaq(text: string) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/).map((b) => b.trim());
  const start = blocks.findIndex((b) => /^## (frequently asked questions|faqs?)\b/i.test(b));
  if (start < 0) return [];
  const faq: { q: string; a: string }[] = [];
  for (let i = start + 1; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.startsWith("## ")) break;
    if (b.startsWith("### ")) faq.push({ q: b.slice(4), a: "" });
    else if (faq.length) {
      const last = faq[faq.length - 1];
      if (last.a) break; // one paragraph per answer; anything after ends the FAQ section
      last.a = b.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*/g, "");
    }
  }
  return faq.filter((f) => f.a);
}

export function extractHeadings(text: string) {
  return text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter((b) => b.startsWith("## "))
    .map((b) => ({ text: b.slice(3), id: headingId(b.slice(3)) }));
}

export function plainText(text: string) {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*/g, "").replace(/^#+\s|^[->]\s|^\d+\.\s/gm, "");
}
