"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { onToast } from "@/lib/toast";
import { CheckCircle, AlertCircle, AlertTriangle, X } from "lucide-react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "warning";
}

let nextId = 0;

export default function ToastBanner() {
  const searchParams = useSearchParams();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: "success" | "error" | "warning") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), type === "error" ? 6000 : 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => { onToast(addToast); }, [addToast]);

  // Handle URL-based toasts (email verification etc.)
  useEffect(() => {
    if (searchParams.get("verified") === "true") {
      addToast("Email verified successfully!", "success");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams, addToast]);

  if (toasts.length === 0) return null;

  const icons = {
    success: <CheckCircle className="w-4 h-4 flex-shrink-0 text-bone" aria-hidden="true" />,
    error: <AlertCircle className="w-4 h-4 flex-shrink-0 text-rec" aria-hidden="true" />,
    warning: <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rec" aria-hidden="true" />,
  };

  // Square ink panel with a hairline; the left rule carries the status (rec = needs attention).
  const colors = {
    success: "border-l-bone",
    error: "border-l-rec",
    warning: "border-l-rec",
  };

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} role={t.type === "error" ? "alert" : "status"}
          className={`bg-ink text-bone border border-line border-l-2 ${colors[t.type]} px-5 py-3 shadow-lg flex items-center gap-2.5 text-sm pointer-events-auto animate-fade-in max-w-md`}>
          {icons[t.type]}
          <span>{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="ml-1 text-dim hover:text-bone" aria-label="Dismiss notification">
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
