// Public key for web push (safe to share; the private key lives in Supabase Vault)
export const VAPID_PUBLIC_KEY =
  "BOGVHtrm3Ri1o7ehaZINSc94g4MYapZjoqdr-qtNa_ML7T9aCTVNBDhG_GXjLKYKhE8R3MWROuHdVle5811BCmQ";

export function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function registerServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    return null;
  }
}
