import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Molero HQ",
    short_name: "Molero",
    description: "Agenda, contenido, ventas y asistente IA de la marca Molero.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#EDF2EF",
    theme_color: "#EDF2EF",
    lang: "es",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Captura rápida", short_name: "Capturar", url: "/?captura=1" },
      { name: "Agenda de hoy", short_name: "Agenda", url: "/agenda" },
    ],
  };
}
