import type { Metadata, Viewport } from "next";
import { Noto_Sans_TC } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const noto = Noto_Sans_TC({
  weight: ["400", "500", "700", "900"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "台中伴手禮地圖",
  description: "突然要買伴手禮，先定位，再看台中附近的名店。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f1e7",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-Hant" className={noto.className}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
