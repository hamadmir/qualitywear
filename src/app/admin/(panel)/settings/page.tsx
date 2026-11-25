import { createClient } from "@/lib/supabase/server";
import type { Settings } from "@/lib/types";
import SettingsForm from "@/components/admin/SettingsForm";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("*").eq("id", 1).single();
  return (
    <div>
      <h1 className="text-2xl font-bold">Settings</h1>
      <SettingsForm settings={data as Settings} />
    </div>
  );
}
