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
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
