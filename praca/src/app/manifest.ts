import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Praça",
    short_name: "Praça",
    description: "Cada imóvel, um registo limpo. Cada preço, uma prova.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f4f1",
    theme_color: "#1d3fb5",
    lang: "pt-PT",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Comprar", url: "/comprar" },
      { name: "Calculadoras", url: "/calculadoras" },
      { name: "Favoritos", url: "/conta/favoritos" },
    ],
  };
}
