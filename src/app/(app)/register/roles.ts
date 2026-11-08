/** Pure helpers for the register page (kept out of page.tsx so they can be unit-tested). */

export type Role = "USER" | "PHOTOGRAPHER";

export const ROLE_OPTIONS: { value: Role; title: string; who: string; body: string }[] = [
  { value: "PHOTOGRAPHER", title: "I shoot photos", who: "Photographer", body: "Upload sessions and sell photos." },
  { value: "USER", title: "I'm in the photos", who: "Athlete", body: "Find and buy your photos." },
];

/** `?role=photographer` (homepage / guide CTAs) preselects Photographer; anything else is an athlete. */
export function roleFromQuery(param: string | null): Role {
  return param === "photographer" ? "PHOTOGRAPHER" : "USER";
}

/** Same rules as validatePassword in src/lib/validation.ts, split so the form can tick them off live. */
export function passwordChecks(pw: string): { label: string; ok: boolean }[] {
  return [
    { label: "8+ characters", ok: pw.length >= 8 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(pw) },
    { label: "Lowercase letter", ok: /[a-z]/.test(pw) },
    { label: "A number", ok: /[0-9]/.test(pw) },
  ];
}
