"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function ToastBanner() {
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified");
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (verified === "true") {
      setShow(true);
      window.history.replaceState({}, "", window.location.pathname);
      const timer = setTimeout(() => setShow(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [verified]);

  if (!show) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div className="bg-green-500/90 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm">
        <span>✓</span> Email verified successfully!
        <button onClick={() => setShow(false)} className="ml-2 text-white/70 hover:text-white">✕</button>
      </div>
    </div>
  );
}
