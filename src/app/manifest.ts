import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quality Wear",
    short_name: "Quality Wear",
    description: "Premium menswear. Cash on delivery across Pakistan.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6f4ef",
    theme_color: "#111111",
    orientation: "portrait",
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Shop", url: "/shop", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Track order", url: "/track", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
