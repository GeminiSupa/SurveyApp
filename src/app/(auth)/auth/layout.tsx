export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8">
      <div className="glass-panel w-full rounded-2xl p-6">{children}</div>
    </div>
  );
}
