"use client";

import { useEffect, useState } from "react";
import { Ruler, X } from "lucide-react";

/** Size chart text format: first line with "|" is the header, following "|" lines are rows, other lines are notes. */
export function parseSizeChart(text: string) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const tableLines = lines.filter((l) => l.includes("|"));
  const notes = lines.filter((l) => !l.includes("|"));
  const rows = tableLines.map((l) => l.split("|").map((c) => c.trim()));
  return { header: rows[0] ?? [], rows: rows.slice(1), notes };
}

export default function SizeChart({ chart, title }: { chart: string; title: string }) {
  const [open, setOpen] = useState(false);
  const { header, rows, notes } = parseSizeChart(chart);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);
  if (!header.length) return null;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-brass underline-offset-4 hover:underline">
        <Ruler className="h-3.5 w-3.5" /> Size guide
      </button>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Size guide"
            onClick={(e) => e.stopPropagation()}
            className="animate-fade-up max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-t-[28px] bg-white p-6 sm:rounded-[28px] sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-brass">Size guide</p>
                <h3 className="mt-1 font-display text-2xl font-bold">{title}</h3>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-neutral-100" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-6 overflow-x-auto rounded-2xl border border-black/5">
              <table className="w-full text-sm">
                <thead className="bg-ink text-white">
                  <tr>
                    {header.map((h) => (
                      <th key={h} className="whitespace-nowrap px-4 py-3 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {rows.map((r, i) => (
                    <tr key={i} className="odd:bg-ivory/60">
                      {header.map((_, j) => (
                        <td key={j} className={`whitespace-nowrap px-4 py-3 ${j === 0 ? "font-bold" : ""}`}>{r[j] ?? ""}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {notes.length > 0 && (
              <ul className="mt-4 space-y-1 text-xs text-neutral-500">
                {notes.map((n) => <li key={n}>{n}</li>)}
              </ul>
            )}
            <p className="mt-4 text-xs text-neutral-500">
              Between sizes? Message us on WhatsApp and we&apos;ll help you choose.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
