import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import type { BlogPost } from "@/lib/types";

export default async function AdminBlogPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("blog_posts").select("*").order("created_at", { ascending: false });
  const posts = (data as BlogPost[]) ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Journal</h1>
        <Link href="/admin/blog/new" className="btn-primary ml-auto">
          <Plus className="h-4 w-4" /> New article
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="card mt-6 p-12 text-center">
          <p className="text-neutral-600">No articles yet.</p>
          <p className="mt-1 text-sm text-neutral-500">For example: &quot;5 ways to style a white shirt&quot; or &quot;How to choose the right jeans&quot;</p>
          <Link href="/admin/blog/new" className="btn-primary mt-4">Write your first article</Link>
        </div>
      ) : (
        <ul className="card mt-6 divide-y divide-neutral-100 overflow-hidden">
          {posts.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/blog/${p.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-neutral-50">
                <div className="h-14 w-20 shrink-0 overflow-hidden rounded bg-sand">
                  {p.cover_url && <img src={p.cover_url} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.title}</p>
                  <p className="text-xs text-neutral-500">
                    {p.is_published && p.published_at ? `Published ${formatDate(p.published_at)}` : `Draft · ${formatDate(p.created_at)}`}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    p.is_published ? "bg-green-100 text-green-800" : "bg-neutral-200 text-neutral-600"
                  }`}
                >
                  {p.is_published ? "Live" : "Draft"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
