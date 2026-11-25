import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { BlogPost } from "@/lib/types";
import BlogForm from "@/components/admin/BlogForm";

export default async function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("blog_posts").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  return <BlogForm post={data as BlogPost} />;
}
