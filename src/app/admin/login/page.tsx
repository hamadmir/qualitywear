"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "setup";

export default function AdminLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function finishLogin() {
    const supabase = createClient();
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) {
      await supabase.auth.signOut();
      setLoading(false);
      setError("This account does not have admin access.");
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const supabase = createClient();

    if (mode === "setup") {
      if (password.length < 8) return setError("Use at least 8 characters for your password.");
      if (password !== confirm) return setError("The two passwords don't match.");
      setLoading(true);
      const { error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password });
      if (signUpError) {
        setLoading(false);
        setError(
          /registered|exists/i.test(signUpError.message)
            ? "An account with this email already exists. Please sign in instead."
            : signUpError.message
        );
        return;
      }
    } else {
      setLoading(true);
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) {
      setLoading(false);
      setError(mode === "setup" ? "Account created, but sign-in failed. Please try signing in." : "Incorrect email or password.");
      return;
    }
    await finishLogin();
  }

  const field =
    "w-full rounded-2xl border border-black/10 bg-ivory/60 px-4 py-3 text-sm outline-none transition focus:border-ink focus:bg-white focus:ring-4 focus:ring-black/5";

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-amber/15 blur-3xl" />
      <form onSubmit={onSubmit} className="animate-fade-up relative w-full max-w-sm rounded-[28px] bg-white p-8 shadow-2xl">
        <div className="flex items-center justify-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-sm font-extrabold text-amber">QW</span>
          <span className="text-lg font-bold tracking-tight">Quality Wear</span>
        </div>
        <p className="mt-2 text-center text-sm text-neutral-500">
          {mode === "login" ? "Sign in to the admin panel" : "Create your admin password"}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-1 rounded-full bg-ivory p-1 text-sm font-semibold">
          {(["login", "setup"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError("");
              }}
              className={`rounded-full py-2 transition ${mode === m ? "bg-ink text-white" : "text-neutral-500"}`}
            >
              {m === "login" ? "Sign in" : "First time setup"}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required className={field} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div>
            <label className="label" htmlFor="password">{mode === "login" ? "Password" : "Choose a password"}</label>
            <input
              id="password"
              type="password"
              required
              className={field}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>
          {mode === "setup" && (
            <div>
              <label className="label" htmlFor="confirm">Confirm password</label>
              <input id="confirm" type="password" required className={field} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            </div>
          )}
        </div>
        {error && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink font-semibold text-white transition hover:bg-black disabled:opacity-60" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "login" ? "Sign in" : "Create account & sign in"}
        </button>
        {mode === "setup" && (
          <p className="mt-4 text-center text-xs text-neutral-500">Only the shop owner&apos;s email gets admin access.</p>
        )}
      </form>
    </div>
  );
}
