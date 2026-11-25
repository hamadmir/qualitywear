"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { registerServiceWorker, urlBase64ToUint8Array, VAPID_PUBLIC_KEY } from "@/lib/push";

type State = "loading" | "unsupported" | "ios-install" | "blocked" | "off" | "on";

export default function OrderAlerts() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const ua = navigator.userAgent;
      const isIos = /iphone|ipad|ipod/i.test(ua);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setState(isIos && !standalone ? "ios-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") return setState("blocked");
      const reg = await registerServiceWorker();
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })();
  }, []);

  async function enable() {
    setBusy(true);
    setMsg("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        return;
      }
      const reg = await registerServiceWorker();
      if (!reg) throw new Error("Could not start notifications on this browser.");
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));
      const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const { error } = await createClient()
        .from("push_subscriptions")
        .upsert(
          { endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, user_agent: navigator.userAgent.slice(0, 200) },
          { onConflict: "endpoint" }
        );
      if (error) throw error;
      setState("on");
      setMsg("Done! You'll get a notification on this device for every new order.");
    } catch (err) {
      setMsg((err as Error).message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMsg("");
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await createClient().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
    setState("off");
    setBusy(false);
  }

  async function test() {
    setBusy(true);
    const { error } = await createClient().rpc("send_test_alert");
    setBusy(false);
    setMsg(error ? error.message : "Test sent. It should arrive within a few seconds.");
  }

  if (state === "loading") return null;

  return (
    <div className={`card mt-6 flex flex-wrap items-center gap-4 p-5 ${state === "on" ? "border-green-200 bg-green-50/50" : "border-amber-200 bg-amber-50/60"}`}>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${state === "on" ? "bg-green-600 text-white" : "bg-ink text-amber"}`}>
        {state === "on" ? <BellRing className="h-5 w-5" /> : state === "blocked" ? <BellOff className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {state === "on" ? "New-order alerts are on for this device" : "Get a notification for every new order"}
        </p>
        <p className="text-sm text-neutral-600">
          {state === "on" && "You'll be notified even when the website is closed."}
          {state === "off" && "Turn this on in your phone and computer browsers. Works even when the website is closed."}
          {state === "blocked" && "Notifications are blocked for this site. Allow them in your browser settings, then reload."}
          {state === "unsupported" && "This browser doesn't support notifications. Try Chrome on Android or a computer."}
          {state === "ios-install" && "On iPhone: open this site in Safari, tap Share → Add to Home Screen, open the app, then sign in here and turn alerts on."}
        </p>
        {msg && <p className="mt-1 text-sm font-medium text-ink">{msg}</p>}
      </div>
      {state === "off" && (
        <button onClick={enable} disabled={busy} className="btn-primary rounded-full px-5">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Turn on alerts
        </button>
      )}
      {state === "on" && (
        <div className="flex gap-2">
          <button onClick={test} disabled={busy} className="btn-outline rounded-full px-4">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Send test
          </button>
          <button onClick={disable} disabled={busy} className="btn rounded-full px-4 text-neutral-600 hover:bg-white">
            Turn off
          </button>
        </div>
      )}
    </div>
  );
}
