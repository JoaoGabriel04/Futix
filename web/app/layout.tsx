import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "../styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Futix",
  description: "Organize o seu racha de futebol",
  applicationName: "Futix",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Futix",
    description: "Organize o seu racha de futebol",
    type: "website",
    locale: "pt_BR",
    siteName: "Futix",
    images: [{ url: "/logo-futix.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Futix",
    description: "Organize o seu racha de futebol",
    images: ["/logo-futix.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0e0f11",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
