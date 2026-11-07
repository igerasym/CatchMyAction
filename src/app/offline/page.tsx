import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false },
};

/**
 * Shown by the service worker when a page cannot be loaded because there is no connection.
 * Static and free of data fetching, so it can be cached and rendered with no network.
 */
export default function OfflinePage() {
  return (
    <main className="min-h-[70vh] grid place-items-center px-6">
      <div className="max-w-md text-center">
        <p className="hud mb-4">No connection</p>
        <h1 className="disp text-[clamp(36px,9vw,56px)]">
          You&apos;re offline<span className="text-rec">.</span>
        </h1>
        <p className="mt-5 text-mute leading-relaxed">
          This page needs a connection. Photos you have already queued for upload are kept on this
          device and can be resumed once you are back online.
        </p>
        {/* A plain link, so it works even though scripts may not have loaded */}
        <a href="/" className="btn-pri mt-8 inline-flex justify-center">
          Try again
        </a>
      </div>
    </main>
  );
}
