"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, Menu, Phone, Search, ShoppingBag, X } from "lucide-react";
import { useCart } from "./CartProvider";
import type { Category } from "@/lib/types";

const TABS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/store", label: "Our Store" },
  { href: "/blog", label: "Journal" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/track", label: "Track Order" },
];

export default function Header({ categories }: { categories: Category[] }) {
  const { count, ready, settings } = useCart();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();
  const pathname = usePathname();

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setOpen(false);
    setSearchOpen(false);
    router.push(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : "/shop");
  }

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const city = settings.address?.split(",").pop()?.trim();

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 rounded-full border border-black/5 bg-white/85 pl-3 pr-2 shadow-[0_8px_30px_rgba(0,0,0,0.06)] backdrop-blur-md">
        <button className="rounded-full p-2 hover:bg-black/5 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>

        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-sm font-extrabold tracking-tight text-amber">
            QW
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-bold tracking-tight">Quality Wear</span>
            <span className="hidden text-[11px] text-neutral-500 sm:block">Men&apos;s clothing{city ? ` · ${city}` : " · Pakistan"}</span>
          </span>
        </Link>

        <nav className="mx-auto hidden items-center gap-0.5 text-sm font-medium lg:flex">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`whitespace-nowrap rounded-full px-3 py-2 transition ${
                isActive(t.href) ? "bg-ink text-white" : "text-neutral-600 hover:bg-black/5 hover:text-ink"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <button onClick={() => setSearchOpen((v) => !v)} className="rounded-full p-2.5 hover:bg-black/5" aria-label="Search">
            <Search className="h-5 w-5" />
          </button>
          <Link href="/cart" className="relative rounded-full p-2.5 hover:bg-black/5" aria-label="Cart">
            <ShoppingBag className="h-5 w-5" />
            {ready && count > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber px-1 text-[11px] font-bold text-ink">
                {count}
              </span>
            )}
          </Link>
          <Link
            href="/shop"
            className="ml-1 hidden items-center gap-2 rounded-full bg-ink py-1.5 pl-4 pr-1.5 text-sm font-semibold text-white transition hover:bg-black xl:flex"
          >
            Shop Now
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber text-ink">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </div>

      {searchOpen && (
        <form onSubmit={onSearch} className="mx-auto mt-2 max-w-xl">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search shirts, jeans, polos…"
              className="w-full rounded-full border border-black/10 bg-white py-3 pl-11 pr-4 text-sm shadow-lg outline-none focus:border-ink"
            />
          </div>
        </form>
      )}

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-80 max-w-[85%] overflow-y-auto bg-ivory p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-lg font-bold tracking-tight">Menu</span>
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-full p-2 hover:bg-black/5">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={onSearch} className="mb-6">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="input rounded-full" />
            </form>
            <nav className="flex flex-col gap-1 text-base">
              {TABS.map((t) => (
                <Link
                  key={t.href}
                  href={t.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-full px-4 py-2.5 ${isActive(t.href) ? "bg-ink font-semibold text-white" : "hover:bg-black/5"}`}
                >
                  {t.label}
                </Link>
              ))}
            </nav>
            {categories.length > 0 && (
              <>
                <p className="mb-2 mt-6 px-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">Categories</p>
                <nav className="flex flex-col gap-1 text-base">
                  {categories.map((c) => (
                    <Link
                      key={c.id}
                      href={`/shop?category=${c.slug}`}
                      onClick={() => setOpen(false)}
                      className="rounded-full px-4 py-2.5 hover:bg-black/5"
                    >
                      {c.name}
                    </Link>
                  ))}
                </nav>
              </>
            )}
            {settings.phone && (
              <a href={`tel:${settings.phone}`} className="btn-outline mt-6 w-full rounded-full">
                <Phone className="h-4 w-4" /> {settings.phone}
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
