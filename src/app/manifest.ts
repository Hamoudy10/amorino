import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Amorino Café",
    short_name: "Amorino",
    description:
      "Order Mandi, BBQ, seafood, coffee and shakes from Amorino Café Mombasa — pay with M-Pesa and track your delivery live.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFBF5",
    theme_color: "#D97706",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}