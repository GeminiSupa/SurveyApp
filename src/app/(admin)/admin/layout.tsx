"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogoutButton } from "./logout-button";
import { SessionKeeper } from "./session-keeper";
import { LayoutDashboard, FlaskConical, Users, Send, BarChart3, Settings } from "lucide-react";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard",  icon: LayoutDashboard },
  { href: "/admin/lab",       label: "Lab Builder", icon: FlaskConical },
  { href: "/admin/audience",  label: "Audience",    icon: Users },
  { href: "/admin/publish",   label: "Publish",     icon: Send },
  { href: "/admin/analytics", label: "Analytics",   icon: BarChart3 },
  { href: "/admin/settings",  label: "Settings",    icon: Settings },
];

// Pages that are allowed before an org is created
const ONBOARDING_EXEMPT = ["/admin/onboarding"];

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();

  // Check on mount if user has an org; if not, redirect to onboarding
  useEffect(() => {
    if (ONBOARDING_EXEMPT.some((p) => pathname.startsWith(p))) return;

    fetch("/api/admin/organization")
      .then((r) => r.json())
      .then((data) => {
        if (!data.org) {
          router.push("/admin/onboarding");
        }
      })
      .catch(() => {/* network error — allow through */});
  }, [pathname, router]);

  // Don't show sidebar on onboarding page
  if (ONBOARDING_EXEMPT.some((p) => pathname.startsWith(p))) {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto grid min-h-screen w-full max-w-7xl gap-4 p-4 sm:grid-cols-[240px_1fr] sm:p-6">
      <aside className="glass-panel rounded-2xl p-4 h-fit sticky top-6">
        <div className="mb-6">
          <h2 className="text-xs uppercase tracking-[0.22em] text-[var(--muted)] mb-1">Creator Suite</h2>
          <div className="h-px bg-white/5 mt-3" />
        </div>
        <nav className="grid gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[var(--brand)]/15 text-white border border-[var(--brand)]/30"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[var(--brand)]" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-6 pt-4 border-t border-white/5">
          <LogoutButton />
        </div>
      </aside>
      <main className="glass-panel rounded-2xl p-4 sm:p-6 min-h-[80vh]">
        <SessionKeeper />
        {children}
      </main>
    </div>
  );
}
