"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ImagePlus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/image-upload";
import type { Settings } from "@/lib/types";

const TEXT_FIELDS = [
  "shop_name",
  "whatsapp_number",
  "phone",
  "email",
  "address",
  "map_link",
  "opening_hours",
  "instagram_url",
  "facebook_url",
  "tiktok_url",
  "about_text",
  "faq_text",
  "ga_measurement_id",
  "meta_pixel_id",
] as const;
type TextField = (typeof TEXT_FIELDS)[number];

export default function SettingsForm({
  settings,
  paymentInstructions,
  automation,
}: {
  settings: Settings;
  paymentInstructions: string;
  automation: { reminder: number | null; cancel: number | null };
}) {
  const [reminderHours, setReminderHours] = useState(automation.reminder != null ? String(automation.reminder) : "");
  const [cancelHours, setCancelHours] = useState(automation.cancel != null ? String(automation.cancel) : "");
  const router = useRouter();
  const [values, setValues] = useState<Record<TextField, string>>(
    () => Object.fromEntries(TEXT_FIELDS.map((k) => [k, settings[k] ?? ""])) as Record<TextField, string>
  );
  const [delivery, setDelivery] = useState(String(settings.delivery_charge));
  const [freeAbove, setFreeAbove] = useState(settings.free_delivery_above != null ? String(settings.free_delivery_above) : "");
  const [payment, setPayment] = useState(paymentInstructions);
  const [heroUrl, setHeroUrl] = useState<string | null>(settings.hero_image_url);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function field(key: TextField) {
    return {
      value: values[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setSaved(false);
        setValues((v) => ({ ...v, [key]: e.target.value }));
      },
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    const patch: Record<string, string | number | null> = {};
    let hero = heroUrl;
    if (heroFile) {
      try {
        hero = (await uploadImage(createClient(), heroFile, "site")).url;
      } catch (err) {
        setSaving(false);
        setError((err as { message?: string }).message ?? "Picture upload failed");
        return;
      }
    }
    patch.hero_image_url = hero;
    for (const k of TEXT_FIELDS) patch[k] = values[k].trim() || null;
    patch.shop_name = values.shop_name.trim() || "Quality Wear";
    patch.delivery_charge = Number(delivery) || 0;
    patch.free_delivery_above = freeAbove ? Number(freeAbove) : null;
    patch.ga_measurement_id = values.ga_measurement_id.trim().toUpperCase() || null;
    patch.meta_pixel_id = values.meta_pixel_id.replace(/\D/g, "") || null;
    if (patch.ga_measurement_id && !/^G-[A-Z0-9]{4,20}$/.test(String(patch.ga_measurement_id))) {
      setSaving(false);
      setError("Google Analytics ID should look like G-XXXXXXXXXX");
      return;
    }
    const rem = reminderHours.trim() ? Number(reminderHours) : null;
    const can = cancelHours.trim() ? Number(cancelHours) : null;
    if ((rem != null && !(rem >= 1 && rem <= 720)) || (can != null && !(can >= 6 && can <= 2160))) {
      setSaving(false);
      setError("Reminder must be 1–720 hours and auto-cancel 6–2160 hours (or leave empty to turn off).");
      return;
    }
    const supabase = createClient();
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("settings").update(patch).eq("id", 1),
      supabase.from("admin_settings").upsert({
        id: 1,
        payment_instructions: payment.trim() || null,
        reminder_hours: rem,
        auto_cancel_hours: can,
        updated_at: new Date().toISOString(),
      }),
    ]);
    const error = e1 ?? e2;
    setSaving(false);
    if (error) setError(error.message);
    else {
      setHeroUrl(hero);
      setHeroFile(null);
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 max-w-3xl space-y-6">
      <section className="card space-y-5 p-6">
        <h2 className="font-semibold">Shop & contact</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="shop">Shop name</label>
            <input id="shop" className="input" {...field("shop_name")} />
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone number</label>
            <input id="phone" className="input" placeholder="042-1234567 or 03001234567" {...field("phone")} />
          </div>
          <div>
            <label className="label" htmlFor="wa">WhatsApp number</label>
            <input id="wa" className="input" placeholder="03001234567" {...field("whatsapp_number")} />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" className="input" placeholder="info@qualitywear.pk" {...field("email")} />
          </div>
        </div>
      </section>

      <section className="card space-y-3 p-6">
        <h2 className="font-semibold">Home page banner (hero image)</h2>
        <label className="flex aspect-[21/9] cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-neutral-300 text-sm text-neutral-500 hover:border-ink">
          {heroFile || heroUrl ? (
            <img src={heroFile ? URL.createObjectURL(heroFile) : heroUrl!} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1">
              <ImagePlus className="h-6 w-6" /> Choose a wide (landscape) picture
            </span>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              setSaved(false);
              setHeroFile(e.target.files?.[0] ?? null);
            }}
          />
        </label>
        <p className="text-xs text-neutral-500">
          Leave empty to use a featured product picture.
          {(heroFile || heroUrl) && (
            <button
              type="button"
              className="ml-2 text-red-600 hover:underline"
              onClick={() => {
                setSaved(false);
                setHeroFile(null);
                setHeroUrl(null);
              }}
            >
              Remove picture
            </button>
          )}
        </p>
      </section>

      <section className="card space-y-5 p-6">
        <h2 className="font-semibold">Store location</h2>
        <div>
          <label className="label" htmlFor="address">Full address</label>
          <textarea id="address" rows={2} className="input" placeholder="Shop #12, Main Boulevard, Gulberg, Lahore" {...field("address")} />
          <p className="mt-1 text-xs text-neutral-500">A Google Map is created automatically from this address on the Contact, Store and Home pages.</p>
        </div>
        <div>
          <label className="label" htmlFor="map">Google Maps link (optional)</label>
          <input id="map" className="input" placeholder="https://maps.app.goo.gl/..." {...field("map_link")} />
          <p className="mt-1 text-xs text-neutral-500">Open your shop in Google Maps, tap &quot;Share&quot; and paste the link here for exact directions.</p>
        </div>
        <div>
          <label className="label" htmlFor="hours">Opening hours</label>
          <textarea id="hours" rows={2} className="input" placeholder={"Mon–Sat: 11am – 10pm\nSunday: 2pm – 10pm"} {...field("opening_hours")} />
        </div>
      </section>

      <section className="card space-y-5 p-6">
        <h2 className="font-semibold">Social media</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="ig">Instagram link</label>
            <input id="ig" className="input" placeholder="https://instagram.com/..." {...field("instagram_url")} />
          </div>
          <div>
            <label className="label" htmlFor="fb">Facebook link</label>
            <input id="fb" className="input" placeholder="https://facebook.com/..." {...field("facebook_url")} />
          </div>
          <div>
            <label className="label" htmlFor="tt">TikTok link</label>
            <input id="tt" className="input" placeholder="https://tiktok.com/@..." {...field("tiktok_url")} />
          </div>
        </div>
      </section>

      <section className="card space-y-3 p-6">
        <h2 className="font-semibold">Payment details (sent in order chats)</h2>
        <textarea
          id="pay"
          rows={6}
          className="input font-mono text-[13px]"
          placeholder={"Bank: Meezan Bank\nAccount title: Quality Wear\nAccount no: 0000 0000 0000\nIBAN: PK00 MEZN 0000 0000 0000 0000\n\nJazzCash / Easypaisa: 0331 6332925 (Quality Wear)"}
          value={payment}
          onChange={(e) => {
            setSaved(false);
            setPayment(e.target.value);
          }}
        />
        <p className="text-xs text-neutral-500">
          In each order chat, the &quot;Send payment details&quot; button sends these details with the order total. They are never shown publicly on the website.
        </p>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="font-semibold">Unpaid orders (automatic)</h2>
        <p className="text-xs text-neutral-500">
          Timers start when you first reply in the order chat, so a customer always gets your payment details first. Orders where the customer has sent a
          payment screenshot are never cancelled automatically. Leave a box empty to turn that step off.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="remh">Send payment reminder after (hours)</label>
            <input id="remh" type="number" min={1} max={720} className="input" value={reminderHours} onChange={(e) => { setSaved(false); setReminderHours(e.target.value); }} placeholder="Off" />
          </div>
          <div>
            <label className="label" htmlFor="canh">Cancel & release stock after (hours)</label>
            <input id="canh" type="number" min={6} max={2160} className="input" value={cancelHours} onChange={(e) => { setSaved(false); setCancelHours(e.target.value); }} placeholder="Off" />
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="font-semibold">Marketing tracking</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="ga">Google Analytics 4 Measurement ID</label>
            <input id="ga" className="input font-mono" placeholder="G-XXXXXXXXXX" {...field("ga_measurement_id")} />
          </div>
          <div>
            <label className="label" htmlFor="px">Meta (Facebook / Instagram) Pixel ID</label>
            <input id="px" className="input font-mono" placeholder="123456789012345" {...field("meta_pixel_id")} />
          </div>
        </div>
        <p className="text-xs text-neutral-500">
          Tracks page views, product views, add to cart, checkout and purchases automatically. Find the GA4 ID in Google Analytics → Admin → Data streams,
          and the Pixel ID in Meta Events Manager.
        </p>
      </section>

      <section className="card space-y-5 p-6">
        <h2 className="font-semibold">Delivery</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="dc">Delivery charges (Rs.)</label>
            <input id="dc" type="number" min={0} className="input" value={delivery} onChange={(e) => setDelivery(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="fa">Free delivery above (Rs.)</label>
            <input id="fa" type="number" min={0} className="input" placeholder="Leave empty for never" value={freeAbove} onChange={(e) => setFreeAbove(e.target.value)} />
          </div>
        </div>
      </section>

      <section className="card space-y-3 p-6">
        <h2 className="font-semibold">About Us page</h2>
        <textarea id="about" rows={8} className="input" placeholder="Tell your story. Leave empty to show a default text." {...field("about_text")} />
        <p className="text-xs text-neutral-500">Leave an empty line to start a new paragraph.</p>
      </section>

      <section className="card space-y-3 p-6">
        <h2 className="font-semibold">FAQ (shown on the home page)</h2>
        <textarea
          id="faq"
          rows={10}
          className="input font-mono text-[13px]"
          placeholder={"How do I pay?\nBy bank transfer, JazzCash or Easypaisa after we confirm your order in chat.\n\nHow long does delivery take?\n3 to 5 working days."}
          {...field("faq_text")}
        />
        <p className="text-xs text-neutral-500">
          First line is the question, the lines below are the answer. Leave an empty line between questions. Leave empty to use the default questions.
        </p>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary px-6 py-3" disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
        {saved ? "Saved" : "Save changes"}
      </button>
    </form>
  );
}
