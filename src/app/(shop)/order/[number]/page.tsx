import type { Metadata } from "next";
import { getSettings } from "@/lib/shop-data";
import OrderChat from "@/components/shop/OrderChat";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

export default async function OrderChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ number: string }>;
  searchParams: Promise<{ t?: string; new?: string }>;
}) {
  const [{ number }, { t, new: isNew }, settings] = await Promise.all([params, searchParams, getSettings()]);
  return (
    <OrderChat
      orderNo={decodeURIComponent(number)}
      token={t ?? ""}
      justPlaced={isNew === "1"}
      whatsapp={settings.whatsapp_number}
    />
  );
}
