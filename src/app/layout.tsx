import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import Providers from "./providers";
import NavBar from "./navbar";
import ServiceWorkerRegister from "./components/sw-register";
import InstallBanner from "./components/install-banner";
import ToastBanner from "./components/toast-banner";
import { archivo, mono } from "./fonts";

const BASE_URL = "https://catchmyactions.com";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // use the full screen behind the iPhone notch
  themeColor: "#0c1222",
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "CatchMyAction — Find Yourself in Action",
    template: "%s | CatchMyAction",
  },
  description:
    "Find yourself in action sports photos. Photographers shoot sessions, you find your photos, buy HD downloads. Surf, skate, MTB, marathon, triathlon and more.",
  keywords: [
    "action sports photography", "surf photos", "skate photos", "marathon photos",
    "triathlon photos", "MTB photos", "find yourself in action", "sports photographer",
    "buy action photos", "face recognition photos",
  ],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/pwa-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "CatchMyAction",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "CatchMyAction",
    title: "CatchMyAction — Find Yourself in Action",
    description:
      "Find yourself in action sports photos. Photographers shoot, you find your photos, buy HD downloads.",
    images: [
      {
        url: `${BASE_URL}/hero-bg.jpg`,
        width: 1200,
        height: 630,
        alt: "CatchMyAction — Find Yourself in Action",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CatchMyAction — Find Yourself in Action",
    description:
      "Find yourself in action sports photos. Photographers shoot, you find your photos, buy HD downloads.",
    images: [`${BASE_URL}/hero-bg.jpg`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${archivo.variable} ${mono.variable}`}>
      <body className="bg-char text-bone min-h-screen">
        <ServiceWorkerRegister />
        <InstallBanner />
        <Providers>
          <NavBar />
          {/* reads useSearchParams — must sit in Suspense so static pages can prerender */}
          <Suspense fallback={null}>
            <ToastBanner />
          </Suspense>
          {children}
        </Providers>
      </body>
    </html>
  );
}
