export function reviewPhotoUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/review-photos/${path}`;
}

/** SHA-256 hex of the order token: the folder review photos are uploaded to. */
export async function reviewFolder(token: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function summarize(ratings: number[]) {
  const count = ratings.length;
  const avg = count ? ratings.reduce((a, b) => a + b, 0) / count : 0;
  const dist = [5, 4, 3, 2, 1].map((s) => ({ stars: s, n: ratings.filter((r) => r === s).length }));
  return { count, avg: Math.round(avg * 10) / 10, dist };
}
