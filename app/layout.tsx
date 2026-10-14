import { SerwistProvider } from "@serwist/turbopack/react";
import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";

import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = {
  applicationName: "Molero HQ",
  title: { default: "Molero HQ", template: "%s · Molero HQ" },
  description: "Centro de mando de la marca Molero: agenda, contenido, ventas y asistente IA.",
  appleWebApp: { capable: true, title: "Molero HQ", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#EDF2EF",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: algunas extensiones del navegador añaden atributos a <html> antes de hidratar.
    <html lang="es" className={manrope.variable} suppressHydrationWarning>
      <body>
        <SerwistProvider swUrl="/serwist/sw.js" disable={process.env.NODE_ENV === "development"}>
          {children}
        </SerwistProvider>
      </body>
    </html>
  );
}
