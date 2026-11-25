import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, Camera, Clock, MapPin, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/shop-data";
import type { StoreMedia } from "@/lib/types";
import { whatsappLink } from "@/lib/format";
import PageHero from "@/components/ui/PageHero";
import Reveal from "@/components/ui/Reveal";
import Eyebrow from "@/components/ui/Eyebrow";
import StoreGallery from "@/components/shop/StoreGallery";
import { WhatsAppIcon } from "@/components/shop/WhatsAppButton";

export const metadata: Metadata = { title: "Our Store" };

export default async function StorePage() {
  const supabase = await createClient();
  const [settings, { data }] = await Promise.all([
    getSettings(),
    supabase.from("store_media").select("*").order("sort_order").order("created_at"),
  ]);
  const media = (data as StoreMedia[]) ?? [];
  const heroImage = media.find((m) => m.media_type === "image")?.url ?? settings.hero_image_url;
  const heroVideo = media.find((m) => m.media_type === "video");
  const mapLink =
    settings.map_link ||
    (settings.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}` : null);
  const wa = whatsappLink(settings.whatsapp_number, "Hi Quality Wear! I'd like to visit your store.");
  const photos = media.filter((m) => m.media_type === "image").length;
  const videos = media.filter((m) => m.media_type === "video").length;

  return (
    <div className="px-3 sm:px-5">
      <PageHero
        eyebrow="Our store"
        title="Step inside"
        accent="Quality Wear."
        subtitle="Take a look around our store. See the collection in person, try on your size and get advice from our team."
        image={heroImage}
      >
        <div className="flex flex-wrap gap-3">
          {mapLink && (
            <a href={mapLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 rounded-full bg-amber py-2 pl-6 pr-2 font-semibold text-ink">
              Get directions
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-white">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </a>
          )}
          <a href="#gallery" className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-6 py-3 font-semibold backdrop-blur hover:bg-white/20">
            View gallery
          </a>
        </div>
      </PageHero>

      {heroVideo && (
        <Reveal className="mx-auto mt-6 max-w-7xl overflow-hidden rounded-[28px] bg-ink">
          <video src={heroVideo.url} autoPlay muted loop playsInline controls className="max-h-[640px] w-full object-cover" />
        </Reveal>
      )}

      <section id="gallery" className="mx-auto max-w-7xl scroll-mt-28 pt-20">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow>Gallery</Eyebrow>
            <h2 className="mt-4 font-display text-4xl font-bold leading-[1.05] sm:text-6xl">
              A look <span className="font-accent text-neutral-400">around the store.</span>
            </h2>
          </div>
          {media.length > 0 && (
            <p className="flex items-center gap-2 text-sm text-neutral-500">
              <Camera className="h-4 w-4" /> {photos} {photos === 1 ? "photo" : "photos"}
              {videos > 0 && ` · ${videos} ${videos === 1 ? "video" : "videos"}`}
            </p>
          )}
        </Reveal>
        <div className="mt-10">
          {media.length === 0 ? (
            <Reveal className="rounded-[28px] border border-dashed border-black/15 bg-white/60 p-14 text-center">
              <Camera className="mx-auto h-8 w-8 text-neutral-400" />
              <p className="mt-4 text-lg font-semibold">Store photos are coming soon.</p>
              <p className="mt-1 text-sm text-neutral-500">In the meantime, browse our collection online.</p>
              <Link href="/shop" className="btn-outline mt-6 rounded-full px-6">Shop now</Link>
            </Reveal>
          ) : (
            <StoreGallery media={media} />
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl pt-20">
        <Reveal className="grid overflow-hidden rounded-[28px] bg-ink text-white md:grid-cols-2">
          <div className="p-8 sm:p-12">
            <Eyebrow light>Visit us</Eyebrow>
            <h2 className="mt-4 font-display text-4xl font-bold leading-[1.05]">
              We&apos;d love to <span className="font-accent text-amber">see you.</span>
            </h2>
            <ul className="mt-8 space-y-4 text-sm text-white/75">
              {settings.address && (
                <li className="flex gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
                  <span className="whitespace-pre-line">{settings.address}</span>
                </li>
              )}
              {settings.opening_hours && (
                <li className="flex gap-3">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
                  <span className="whitespace-pre-line">{settings.opening_hours}</span>
                </li>
              )}
              {settings.phone && (
                <li className="flex gap-3">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
                  <a href={`tel:${settings.phone}`} className="hover:text-white">{settings.phone}</a>
                </li>
              )}
              {!settings.address && !settings.phone && <li>Store details will be added soon.</li>}
            </ul>
            <div className="mt-10 flex flex-wrap gap-3">
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 font-semibold text-white">
                  <WhatsAppIcon className="h-5 w-5" /> Ask before you visit
                </a>
              )}
              <Link href="/contact" className="inline-flex items-center rounded-full border border-white/25 px-5 py-3 font-semibold hover:bg-white/10">
                Contact us
              </Link>
            </div>
          </div>
          {settings.address ? (
            <iframe
              src={`https://maps.google.com/maps?q=${encodeURIComponent(settings.address)}&output=embed`}
              title="Store location"
              className="h-80 w-full md:h-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            heroImage && <img src={heroImage} alt="" className="h-80 w-full object-cover md:h-full" />
          )}
        </Reveal>
      </section>
    </div>
  );
}
