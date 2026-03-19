"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function PurchaseSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (sessionId) {
      // Payment was processed via webhook — just show success
      setStatus("success");
    } else {
      setStatus("error");
    }
  }, [sessionId]);

  if (status === "loading") {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Confirming your purchase...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-red-600 mb-2">
          Something went wrong
        </h1>
        <p className="text-gray-500">
          We couldn&apos;t confirm your purchase. Please contact support.
        </p>
        <a
          href="/"
          className="inline-block mt-4 px-6 py-2 bg-ocean-600 text-white rounded-lg"
        >
          Back to Home
        </a>
      </div>
    );
  }

  return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4">🎉</div>
      <h1 className="text-2xl font-bold mb-2">Purchase Complete</h1>
      <p className="text-gray-500 mb-6">
        Your high-resolution photo is ready for download.
      </p>
      <p className="text-sm text-gray-400 mb-6">
        You can download your photo from the session page (up to 5 times).
      </p>
      <a
        href="/"
        className="inline-block px-6 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700"
      >
        Browse More Sessions
      </a>
    </div>
  );
}
