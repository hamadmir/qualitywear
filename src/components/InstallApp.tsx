"use client";

import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { registerServiceWorker } from "@/lib/push";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const KEY = "qw-install-dismissed";

/** Registers the service worker and offers "Add to Home Screen" on phones. */
export default function InstallApp() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [show, setShow] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);

  useEffect(() => {
    registerServiceWorker();

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;

    let dismissed = false;
    try {
      const at = Number(localStorage.getItem(KEY) || 0);
      dismissed = Date.now() - at < 14 * 86400 * 1000;
    } catch {
      // storage unavailable
    }
    if (dismissed) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallEvent);
      setTimeout(() => setShow(true), 8000);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const ua = navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/crios|fxios/i.test(ua);
    let t: ReturnType<typeof setTimeout> | undefined;
    if (isIos) {
      setIos(true);
      t = setTimeout(() => setShow(true), 12000);
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      if (t) clearTimeout(t);
    };
  }, []);

  function dismiss() {
    setShow(false);
    setIosHelp(false);
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      // storage unavailable
    }
  }

  async function install() {
    if (ios) {
      setIosHelp(true);
      return;
    }
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => null);
    setDeferred(null);
    dismiss();
  }

  if (!show || (!deferred && !ios)) return null;

  return (
    <div className="animate-fade-up fixed inset-x-3 bottom-24 z-40 mx-auto max-w-sm rounded-[22px] bg-ink p-4 text-white shadow-2xl sm:bottom-6 sm:left-6 sm:right-auto">
      <button onClick={dismiss} className="absolute right-3 top-3 rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white" aria-label="Close">
        <X className="h-4 w-4" />
      </button>
      {iosHelp ? (
        <div className="pr-6 text-sm">
          <p className="font-semibold">Add Quality Wear to your Home Screen</p>
          <ol className="mt-3 space-y-2 text-white/80">
            <li className="flex items-center gap-2">
              1. Tap <Share className="h-4 w-4 text-amber" /> <span className="font-medium text-white">Share</span> below
            </li>
            <li className="flex items-center gap-2">
              2. Choose <SquarePlus className="h-4 w-4 text-amber" /> <span className="font-medium text-white">Add to Home Screen</span>
            </li>
          </ol>
        </div>
      ) : (
        <div className="flex items-center gap-3 pr-6">
          <img src="/icon-192.png" alt="" className="h-11 w-11 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Get the Quality Wear app</p>
            <p className="text-xs text-white/60">Faster shopping from your home screen</p>
          </div>
          <button onClick={install} className="flex items-center gap-1.5 rounded-full bg-amber px-4 py-2 text-sm font-semibold text-ink">
            <Download className="h-4 w-4" /> Install
          </button>
        </div>
      )}
    </div>
  );
}
