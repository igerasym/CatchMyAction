import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import NavBar from "./navbar";

export const metadata: Metadata = {
  title: "SurfShots — Find Your Surf Photos",
  description:
    "Browse and purchase high-quality surf photography from your sessions.",
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
          {children}
        </Providers>
      </body>
    </html>
  );
}
