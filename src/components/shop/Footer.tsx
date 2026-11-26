import Link from "next/link";
import { ArrowUpRight, Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import type { Category, Settings } from "@/lib/types";
import { whatsappLink } from "@/lib/format";

export default function Footer({ categories, settings }: { categories: Category[]; settings: Settings }) {
  const wa = whatsappLink(settings.whatsapp_number, "Hi Quality Wear! I'd like to place an order.");
  const socials = [
    { label: "Instagram", url: settings.instagram_url },
    { label: "Facebook", url: settings.facebook_url },
    { label: "TikTok", url: settings.tiktok_url },
  ].filter((s) => s.url);

  return (
    <footer className="mt-24 px-3 pb-3 sm:px-5 sm:pb-5">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[28px] bg-ink text-neutral-400">
        <div className="grid gap-10 px-6 py-14 sm:px-10 lg:grid-cols-[1.3fr_1fr_1fr_1.3fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber text-sm font-extrabold tracking-tight text-ink">
                QW
              </span>
              <span className="text-lg font-bold tracking-tight text-white">Quality Wear</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed">
              Premium menswear built to last: shirts, jeans, polos and jackets. Delivered across Pakistan.
            </p>
            {socials.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-white/15 px-3.5 py-1.5 text-xs text-white hover:border-amber hover:text-amber"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-white">Shop</p>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/shop" className="hover:text-white">All Products</Link></li>
              {categories.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <Link href={`/shop?category=${c.slug}`} className="hover:text-white">{c.name}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-white">Company</p>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/about" className="hover:text-white">About Us</Link></li>
              <li><Link href="/store" className="hover:text-white">Our Store</Link></li>
              <li><Link href="/blog" className="hover:text-white">Journal</Link></li>
              <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
              <li><Link href="/track" className="hover:text-white">Track Order</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-white">Contact</p>
            <ul className="space-y-3 text-sm">
              {settings.address && (
                <li className="flex gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
                  <span className="whitespace-pre-line">{settings.address}</span>
                </li>
              )}
              {settings.phone && (
                <li className="flex gap-2.5">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
                  <a href={`tel:${settings.phone}`} className="hover:text-white">{settings.phone}</a>
                </li>
              )}
              {wa && (
                <li className="flex gap-2.5">
                  <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                    WhatsApp: {settings.whatsapp_number}
                  </a>
                </li>
              )}
              {settings.email && (
                <li className="flex gap-2.5">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
                  <a href={`mailto:${settings.email}`} className="break-all hover:text-white">{settings.email}</a>
                </li>
              )}
              {settings.opening_hours && (
                <li className="flex gap-2.5">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
                  <span className="whitespace-pre-line">{settings.opening_hours}</span>
                </li>
              )}
            </ul>
            <Link
              href="/contact"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white py-1.5 pl-4 pr-1.5 text-sm font-semibold text-ink hover:bg-amber"
            >
              Get in touch
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-white">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>
        <div className="select-none overflow-hidden whitespace-nowrap px-6 text-[13vw] font-extrabold leading-[0.85] tracking-[-0.06em] text-white/[0.05] sm:px-10 xl:text-[168px]">
          QUALITY WEAR
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-6 py-5 text-xs sm:px-10">
          <span>© {new Date().getFullYear()} {settings.shop_name}. All rights reserved.</span>
          <span>Bank · JazzCash · Easypaisa · Nationwide shipping</span>
        </div>
      </div>
    </footer>
  );
}
