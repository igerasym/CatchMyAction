"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { signedInDestination } from "@/lib/signed-in-redirect";

/**
 * /login and /register make no sense for someone who is already signed in (and the back button
 * from the app used to land on them). Replace the history entry so Back doesn't return here.
 */
export function useRedirectIfSignedIn(callbackUrl: string, wantsPhotographer = false, enabled = true) {
  const { data: session, status } = useSession();
  useEffect(() => {
    if (!enabled || status !== "authenticated") return;
    const role = (session?.user as { role?: string } | undefined)?.role;
    window.location.replace(signedInDestination(role, callbackUrl, wantsPhotographer));
  }, [enabled, status, session, callbackUrl, wantsPhotographer]);
}
