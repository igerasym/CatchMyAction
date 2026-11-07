import type { MetadataRoute } from "next";

/** Web app manifest: lets people add CatchMyAction to their home screen and open it full-screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CatchMyAction",
    short_name: "CatchMyAction",
    description: "Find yourself in action. Surf, kite and action sports photos.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0c1222",
    theme_color: "#0c1222",
    icons: [
      { src: "/icons/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/pwa-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Long-press the home screen icon: jump straight to the two things photographers open most.
    shortcuts: [
      { name: "New session", short_name: "New session", url: "/upload" },
      { name: "Dashboard", short_name: "Dashboard", url: "/dashboard" },
    ],
  };
}
