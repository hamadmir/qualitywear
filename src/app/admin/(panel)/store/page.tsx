import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { StoreMedia } from "@/lib/types";
import StoreMediaManager from "@/components/admin/StoreMediaManager";

export default async function AdminStorePage() {
  const supabase = await createClient();
  const { data } = await supabase.from("store_media").select("*").order("sort_order").order("created_at");

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Store Gallery</h1>
        <Link href="/store" target="_blank" className="ml-auto inline-flex items-center gap-1.5 text-sm text-brass hover:underline">
          View on website <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
      <p className="mt-1 text-sm text-neutral-500">
        Photos and videos of your physical shop. They appear on the &quot;Our Store&quot; page. The first photo is used as the page banner.
      </p>
      <StoreMediaManager media={(data as StoreMedia[]) ?? []} />
    </div>
  );
}
