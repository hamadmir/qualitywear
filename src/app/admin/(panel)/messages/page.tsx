import { createClient } from "@/lib/supabase/server";
import type { ContactMessage } from "@/lib/types";
import MessagesList from "@/components/admin/MessagesList";

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);
  const messages = (data as ContactMessage[]) ?? [];
  const unread = messages.filter((m) => !m.is_read).length;

  return (
    <div>
      <h1 className="text-2xl font-bold">
        Messages {unread > 0 && <span className="ml-2 rounded-full bg-brass px-2.5 py-0.5 text-sm text-white">{unread} new</span>}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">Messages sent through the website contact form</p>
      <MessagesList messages={messages} />
    </div>
  );
}
