import Link from "next/link";
import { HighContrastToggle } from "@/app/high-contrast-toggle";

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div suppressHydrationWarning className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-8 pt-4 sm:px-6">
      <header className="glass-panel sticky top-4 z-10 mb-6 flex items-center justify-between rounded-2xl px-4 py-3">
        <Link href="/" className="text-sm font-semibold tracking-wide">
          Survey Lab
        </Link>
        <nav className="flex items-center gap-2 text-xs sm:text-sm">
          <HighContrastToggle />
          <Link className="rounded-full px-3 py-1.5 hover:bg-white/10" href="/tools">
            Tools
          </Link>
          <Link className="rounded-full px-3 py-1.5 hover:bg-white/10" href="/admin/dashboard">
            Dashboard
          </Link>
          <Link className="rounded-full bg-(--brand-strong) px-3 py-1.5 font-medium text-white" href="/participant/demo">
            Join Demo
          </Link>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
