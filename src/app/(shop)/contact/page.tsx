import type { Metadata } from "next";
import { ArrowUpRight, Clock, Mail, MapPin, Phone } from "lucide-react";
import { getSettings } from "@/lib/shop-data";
import { whatsappLink } from "@/lib/format";
import ContactForm from "@/components/shop/ContactForm";
import { WhatsAppIcon } from "@/components/shop/WhatsAppButton";
import PageHero from "@/components/ui/PageHero";
import Reveal from "@/components/ui/Reveal";

export const metadata: Metadata = { title: "Contact Us" };

export default async function ContactPage() {
  const s = await getSettings();
  const wa = whatsappLink(s.whatsapp_number, "Hi Quality Wear! I have a question.");
  const mapSrc = s.address ? `https://maps.google.com/maps?q=${encodeURIComponent(s.address)}&output=embed` : null;
  const mapLink = s.map_link || (s.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}` : null);

  const items = [
    wa && { icon: WhatsAppIcon, label: "WhatsApp", value: s.whatsapp_number!, href: wa, external: true },
    s.phone && { icon: Phone, label: "Call us", value: s.phone, href: `tel:${s.phone}` },
    s.email && { icon: Mail, label: "Email", value: s.email, href: `mailto:${s.email}` },
    s.address && { icon: MapPin, label: "Store address", value: s.address, href: mapLink ?? undefined, external: true },
    s.opening_hours && { icon: Clock, label: "Opening hours", value: s.opening_hours },
  ].filter(Boolean) as { icon: React.ComponentType<{ className?: string }>; label: string; value: string; href?: string; external?: boolean }[];

  return (
    <div className="px-3 sm:px-5">
      <PageHero
        eyebrow="Contact"
        title="Let's"
        accent="talk."
        subtitle="Questions about an order, a size or a product? Send a message, call or WhatsApp us. We're happy to help."
      >
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 rounded-full bg-[#25D366] py-2 pl-5 pr-2 font-semibold text-white"
          >
            <WhatsAppIcon className="h-5 w-5" /> Chat on WhatsApp
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </a>
        )}
      </PageHero>

      <div className="mx-auto mt-6 grid max-w-7xl gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Reveal className="rounded-[28px] border border-black/5 bg-white p-6 sm:p-10">
          <h2 className="font-display text-3xl font-bold">
            Send us a <span className="font-accent text-neutral-400">message.</span>
          </h2>
          <p className="mt-2 text-sm text-neutral-500">We usually reply within a few hours.</p>
          <ContactForm />
        </Reveal>

        <div className="space-y-3">
          {items.map((it, i) => {
            const body = (
              <div className="group flex items-center gap-4 rounded-[22px] border border-black/5 bg-white p-5 transition hover:border-ink">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink text-amber">
                  <it.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-neutral-400">{it.label}</p>
                  <p className="mt-1 whitespace-pre-line font-semibold">{it.value}</p>
                </div>
                {it.href && <ArrowUpRight className="h-5 w-5 text-neutral-300 transition group-hover:text-ink" />}
              </div>
            );
            return (
              <Reveal key={it.label} delay={i * 80}>
                {it.href ? (
                  <a href={it.href} className="block" {...(it.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                    {body}
                  </a>
                ) : (
                  body
                )}
              </Reveal>
            );
          })}
        </div>
      </div>

      {mapSrc && (
        <Reveal className="mx-auto mt-6 max-w-7xl overflow-hidden rounded-[28px] border border-black/5 bg-white p-2">
          <iframe
            src={mapSrc}
            title="Quality Wear location"
            className="h-[420px] w-full rounded-[22px]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </Reveal>
      )}
    </div>
  );
}
