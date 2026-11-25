"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="currentColor">
      <path d="M16.04 3C8.86 3 3.05 8.8 3.05 15.97c0 2.3.6 4.53 1.74 6.5L3 29l6.7-1.75a12.95 12.95 0 0 0 6.33 1.62h.01c7.17 0 12.99-5.8 12.99-12.97A12.9 12.9 0 0 0 16.04 3Zm0 23.68h-.01a10.8 10.8 0 0 1-5.5-1.5l-.4-.24-3.98 1.04 1.06-3.88-.26-.4a10.74 10.74 0 0 1-1.65-5.73c0-5.95 4.85-10.79 10.8-10.79a10.79 10.79 0 0 1 10.78 10.8c0 5.95-4.85 10.7-10.84 10.7Zm5.92-8.08c-.32-.16-1.92-.95-2.22-1.06-.3-.11-.51-.16-.73.16-.21.32-.84 1.06-1.03 1.27-.19.22-.38.24-.7.08-.33-.16-1.38-.51-2.62-1.62-.97-.86-1.62-1.93-1.81-2.25-.19-.33-.02-.5.14-.66.15-.15.33-.38.49-.57.16-.19.21-.32.32-.54.11-.21.05-.4-.03-.56-.08-.16-.73-1.76-1-2.41-.26-.63-.53-.55-.73-.56h-.62c-.22 0-.57.08-.86.4-.3.33-1.14 1.11-1.14 2.71 0 1.6 1.17 3.15 1.33 3.36.16.22 2.3 3.5 5.56 4.91.78.33 1.38.53 1.86.68.78.25 1.49.21 2.05.13.63-.09 1.92-.79 2.19-1.54.27-.76.27-1.4.19-1.54-.08-.13-.29-.21-.62-.37Z" />
    </svg>
  );
}

export default function WhatsAppButton({ number }: { number: string }) {
  const [showTip, setShowTip] = useState(false);
  let digits = number.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "92" + digits.slice(1);
  const href = `https://wa.me/${digits}?text=${encodeURIComponent("Hi Quality Wear! I'd like to know more about your products.")}`;

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem("qw-wa-tip") === "1";
    } catch {
      // storage unavailable
    }
    if (dismissed) return;
    const t = setTimeout(() => setShowTip(true), 4000);
    return () => clearTimeout(t);
  }, []);

  function closeTip() {
    setShowTip(false);
    try {
      sessionStorage.setItem("qw-wa-tip", "1");
    } catch {
      // storage unavailable
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex items-end gap-3 sm:bottom-7 sm:right-7">
      {showTip && (
        <div className="animate-fade-up relative mb-2 hidden max-w-[230px] rounded-2xl bg-white p-4 pr-8 text-sm shadow-[0_16px_40px_rgba(0,0,0,0.15)] sm:block">
          <button onClick={closeTip} className="absolute right-2 top-2 rounded-full p-1 text-neutral-400 hover:bg-black/5" aria-label="Close">
            <X className="h-3.5 w-3.5" />
          </button>
          <p className="font-semibold">Need help choosing?</p>
          <p className="mt-0.5 text-neutral-500">Chat with us on WhatsApp. We usually reply within minutes.</p>
        </div>
      )}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        onClick={closeTip}
        className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_12px_30px_rgba(37,211,102,0.45)] transition hover:scale-105 sm:h-16 sm:w-16"
      >
        <span className="wa-ping absolute inset-0 rounded-full bg-[#25D366]" />
        <WhatsAppIcon className="relative h-7 w-7 sm:h-8 sm:w-8" />
      </a>
    </div>
  );
}

export { WhatsAppIcon };
