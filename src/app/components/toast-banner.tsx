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
    success: <CheckCircle className="w-4 h-4 flex-shrink-0" />,
    error: <AlertCircle className="w-4 h-4 flex-shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 flex-shrink-0" />,
  };

  const colors = {
    success: "bg-green-500/90 text-white",
    error: "bg-red-500/90 text-white",
    warning: "bg-yellow-500/90 text-black",
  };

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id}
          className={`${colors[t.type]} px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-2.5 text-sm pointer-events-auto animate-fade-in max-w-md`}>
          {icons[t.type]}
          <span>{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="ml-1 opacity-60 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
