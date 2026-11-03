export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <main className="max-w-[1320px] mx-auto px-5 md:px-12 py-6 min-h-screen bg-char text-bone">{children}</main>;
}
