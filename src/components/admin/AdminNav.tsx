"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  BellRing,
  ExternalLink,
  FileText,
  Star,
  FolderTree,
  Inbox,
  TicketPercent,
  Camera,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/stock-alerts", label: "Stock Alerts", icon: BellRing },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/coupons", label: "Coupons", icon: TicketPercent },
  { href: "/admin/messages", label: "Messages", icon: Inbox },
  { href: "/admin/blog", label: "Journal", icon: FileText },
  { href: "/admin/store", label: "Store Gallery", icon: Camera },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await createClient().auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-1">
      {LINKS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              active ? "bg-white/10 text-white" : "text-neutral-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </Link>
        );
      })}
      <Link
        href="/"
        target="_blank"
        className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-neutral-400 hover:text-white"
      >
        <ExternalLink className="h-4 w-4" /> View website
      </Link>
      <div className="mt-auto border-t border-white/10 pt-4">
        <p className="truncate px-3 text-xs text-neutral-500">{email}</p>
        <button
          onClick={logout}
          className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-neutral-400 hover:text-white"
        >
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </div>
    </nav>
  );

  return (
    <>
      <div className="flex items-center justify-between bg-ink px-4 py-3 text-white print:hidden lg:hidden">
        <span className="font-display font-bold tracking-[0.18em]">
          QW <span className="text-brass">ADMIN</span>
        </span>
        <button onClick={() => setOpen(true)} aria-label="Menu">
          <Menu className="h-5 w-5" />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-ink p-4">
            <button className="mb-4 self-end text-white" onClick={() => setOpen(false)} aria-label="Close">
              <X className="h-5 w-5" />
            </button>
            {nav}
          </aside>
        </div>
      )}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto bg-ink p-4 print:hidden lg:flex">
        <p className="mb-8 px-3 pt-2 font-display text-lg font-bold tracking-[0.18em] text-white">
          QW <span className="text-brass">ADMIN</span>
        </p>
        {nav}
      </aside>
    </>
  );
}
