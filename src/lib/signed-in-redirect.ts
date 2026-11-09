/** Where a signed-in visitor of /login or /register should be sent instead. */
export function signedInDestination(role: string | undefined, callbackUrl: string, wantsPhotographer: boolean): string {
  if (role === "PHOTOGRAPHER") return wantsPhotographer || callbackUrl === "/" ? "/dashboard" : callbackUrl;
  // Athlete asking for a photographer account: the switch lives in settings
  if (wantsPhotographer) return "/settings";
  return callbackUrl;
}
