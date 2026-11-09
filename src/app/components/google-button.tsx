"use client";

import { useEffect, useState } from "react";
import { getProviders, signIn } from "next-auth/react";
import { SIGNUP_ROLE_COOKIE } from "@/lib/google-auth";

interface Props {
  callbackUrl: string;
  /** Role a brand-new account gets (existing accounts keep theirs). */
  role?: "USER" | "PHOTOGRAPHER";
  disabled?: boolean;
  label?: string;
  /** Draw an "or" divider below (only when the button itself is shown). */
  divider?: boolean;
  children?: React.ReactNode;
}

/** "Continue with Google". Renders nothing unless the server has Google configured. */
export default function GoogleButton({ callbackUrl, role = "USER", disabled, label = "Continue with Google", divider, children }: Props) {
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getProviders().then((p) => setAvailable(!!p?.google)).catch(() => {});
  }, []);

  if (!available) return null;

  function go() {
    setBusy(true);
    // Short-lived, only read when the sign-in creates a new account
    document.cookie = `${SIGNUP_ROLE_COOKIE}=${role}; path=/; max-age=600; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    signIn("google", { callbackUrl });
  }

  return (
    <div>
    <button type="button" onClick={go} disabled={disabled || busy}
      className="btn-sec w-full justify-center gap-3 disabled:opacity-50">
      <svg aria-hidden="true" viewBox="0 0 18 18" className="w-[18px] h-[18px]">
        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z" />
        <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.8.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z" />
        <path fill="#FBBC05" d="M3.96 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3-2.33z" />
        <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z" />
      </svg>
      {busy ? "Opening Google..." : label}
    </button>
    {children}
    {divider && (
      <div className="flex items-center gap-4 my-5" aria-hidden="true">
        <span className="ticks flex-1" />
        <span className="hud">or</span>
        <span className="ticks flex-1" />
      </div>
    )}
    </div>
  );
}
