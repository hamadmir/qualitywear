// Sends web push notifications. Called only by the database (pg_net) with a shared secret header.
// audience "admin": every registered admin device
// audience "order": the customer devices that turned on alerts for one order
// audience "stock": customers who asked for a back-in-stock alert
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

type Sub = { id: string; endpoint: string; p256dh: string; auth: string };

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data: cfg, error: cfgError } = await supabase.rpc("get_push_config");
  if (cfgError || !cfg?.private) return json({ error: "Push is not configured" }, 500);
  if (req.headers.get("x-qw-secret") !== cfg.secret) return json({ error: "Unauthorized" }, 401);

  let payload: { audience?: string; order_id?: string; alert_ids?: string[]; title?: string; body?: string; url?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid body" }, 400);
  }

  webpush.setVapidDetails("mailto:hamadmir92@gmail.com", cfg.public, cfg.private);

  const audience = payload.audience ?? "admin";
  let table = "push_subscriptions";
  let subs: Sub[] = [];
  if (audience === "order" && payload.order_id) {
    table = "customer_push_subscriptions";
    const { data } = await supabase.from(table).select("id, endpoint, p256dh, auth").eq("order_id", payload.order_id);
    subs = (data as Sub[]) ?? [];
  } else if (audience === "stock" && Array.isArray(payload.alert_ids) && payload.alert_ids.length) {
    table = "stock_alerts";
    const { data } = await supabase
      .from(table)
      .select("id, endpoint, p256dh, auth")
      .in("id", payload.alert_ids.slice(0, 1000))
      .not("endpoint", "is", null);
    subs = (data as Sub[]) ?? [];
  } else if (audience === "admin") {
    const { data } = await supabase.from(table).select("id, endpoint, p256dh, auth");
    subs = (data as Sub[]) ?? [];
  } else {
    return json({ error: "Unknown audience" }, 400);
  }

  const message = JSON.stringify({
    title: payload.title ?? "Quality Wear",
    body: payload.body ?? "",
    url: payload.url ?? (audience === "admin" ? "/admin" : "/"),
  });

  let sent = 0;
  const expired: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          message,
          { TTL: 60 * 60 * 24, urgency: "high" }
        );
        sent++;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) expired.push(s.id);
        else console.error("push failed", code, (err as Error).message);
      }
    })
  );
  if (expired.length) {
    if (table === "stock_alerts") {
      await supabase.from(table).update({ endpoint: null, p256dh: null, auth: null }).in("id", expired);
    } else {
      await supabase.from(table).delete().in("id", expired);
    }
  }

  return json({ audience, sent, removed: expired.length, devices: subs.length });
});
