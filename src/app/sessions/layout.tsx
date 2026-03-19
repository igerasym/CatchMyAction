export default function SessionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="max-w-7xl mx-auto px-4 py-6 min-h-screen">{children}</main>
  );
}
