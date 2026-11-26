/* Google Analytics 4 + Meta (Facebook/Instagram) Pixel event helpers. Safe to call when neither is installed. */
type Item = { id: string; name: string; price: number; quantity?: number; variant?: string; category?: string };

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

function ga(event: string, params: Record<string, unknown>) {
  try {
    window.gtag?.("event", event, params);
  } catch {}
}
function fb(event: string, params: Record<string, unknown>) {
  try {
    window.fbq?.("track", event, params);
  } catch {}
}

const gaItems = (items: Item[]) =>
  items.map((i) => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.quantity ?? 1, item_variant: i.variant, item_category: i.category }));

export function trackViewItem(item: Item) {
  ga("view_item", { currency: "PKR", value: item.price, items: gaItems([item]) });
  fb("ViewContent", { content_ids: [item.id], content_name: item.name, content_type: "product", value: item.price, currency: "PKR" });
}

export function trackAddToCart(item: Item) {
  const value = item.price * (item.quantity ?? 1);
  ga("add_to_cart", { currency: "PKR", value, items: gaItems([item]) });
  fb("AddToCart", { content_ids: [item.id], content_name: item.name, content_type: "product", value, currency: "PKR" });
}

export function trackBeginCheckout(items: Item[], value: number) {
  ga("begin_checkout", { currency: "PKR", value, items: gaItems(items) });
  fb("InitiateCheckout", { content_ids: items.map((i) => i.id), num_items: items.length, value, currency: "PKR" });
}

export function trackPurchase(orderNumber: string, value: number, items: Item[]) {
  const key = `qw-tracked-${orderNumber}`;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
  } catch {}
  ga("purchase", { transaction_id: orderNumber, currency: "PKR", value, items: gaItems(items) });
  fb("Purchase", { content_ids: items.map((i) => i.id), content_type: "product", value, currency: "PKR" });
}
