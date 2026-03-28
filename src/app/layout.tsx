import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import NavBar from "./navbar";
import ToastBanner from "./components/toast-banner";

export const dynamic = "force-dynamic";

const BASE_URL = "https://catchmyactions.com";

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
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.svg",
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
  alternates: {
    canonical: BASE_URL,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0a0a0a] text-gray-100 min-h-screen">
        <Providers>
          <NavBar />
          <ToastBanner />
          {children}
        </Providers>
      </body>
    </html>
  );
}
