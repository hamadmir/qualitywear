import { CartProvider } from "@/components/shop/CartProvider";
import Header from "@/components/shop/Header";
import Footer from "@/components/shop/Footer";
import WhatsAppButton from "@/components/shop/WhatsAppButton";
import InstallApp from "@/components/InstallApp";
import { getCategories, getSettings } from "@/lib/shop-data";

export const dynamic = "force-dynamic";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);

  return (
    <CartProvider settings={settings}>
      <Header categories={categories} />
      <main className="min-h-[60vh] animate-fade-in">{children}</main>
      <Footer categories={categories} settings={settings} />
      {settings.whatsapp_number && <WhatsAppButton number={settings.whatsapp_number} />}
      <InstallApp />
    </CartProvider>
  );
}
