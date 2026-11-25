"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import type { StoreMedia } from "@/lib/types";
import Reveal from "@/components/ui/Reveal";

export default function StoreGallery({ media }: { media: StoreMedia[] }) {
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (d: number) => setOpen((i) => (i === null ? i : (i + d + media.length) % media.length)),
    [media.length]
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close, step]);

  const current = open !== null ? media[open] : null;

  return (
    <>
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
        {media.map((m, i) => (
          <Reveal key={m.id} delay={(i % 3) * 90} className="break-inside-avoid">
            <button
              onClick={() => setOpen(i)}
              className="group relative block w-full overflow-hidden rounded-[22px] bg-ink text-left"
            >
              {m.media_type === "video" ? (
                <>
                  <video src={m.url} muted playsInline loop preload="metadata" className="w-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition group-hover:bg-black/35">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-ink shadow-lg transition group-hover:scale-110">
                      <Play className="ml-1 h-6 w-6" fill="currentColor" />
                    </span>
                  </span>
                </>
              ) : (
                <img src={m.url} alt={m.caption ?? "Quality Wear store"} loading="lazy" className="w-full object-cover transition duration-700 group-hover:scale-105" />
              )}
              {m.caption && (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-4 pt-10 text-sm font-medium text-white opacity-0 transition group-hover:opacity-100">
                  {m.caption}
                </span>
              )}
            </button>
          </Reveal>
        ))}
      </div>

      {current && (
        <div className="animate-fade-in fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={close}>
          <button onClick={close} className="absolute right-4 top-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
          {media.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                className="absolute left-3 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 sm:left-6"
                aria-label="Previous"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                className="absolute right-3 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 sm:right-6"
                aria-label="Next"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          <figure className="max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            {current.media_type === "video" ? (
              <video key={current.id} src={current.url} controls autoPlay playsInline className="max-h-[80vh] rounded-2xl" />
            ) : (
              <img key={current.id} src={current.url} alt={current.caption ?? ""} className="animate-fade-in max-h-[80vh] rounded-2xl object-contain" />
            )}
            {current.caption && <figcaption className="mt-3 text-center text-sm text-white/80">{current.caption}</figcaption>}
          </figure>
        </div>
      )}
    </>
  );
}
