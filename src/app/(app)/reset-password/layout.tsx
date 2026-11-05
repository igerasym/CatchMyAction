import { Suspense } from "react";

// The page reads the reset token from useSearchParams; Suspense lets the route prerender.
export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
