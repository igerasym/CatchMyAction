import { Suspense } from "react";

// The page reads useSearchParams (callbackUrl, verified=1); Suspense lets the route prerender.
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
