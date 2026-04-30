import Link from "next/link";

export default function LandingPage() {
  return (
    <section className="grid gap-4 sm:gap-6">
      <div className="glass-panel rounded-3xl p-5 sm:p-10">
        <p className="mb-3 text-xs uppercase tracking-[0.22em] text-[var(--muted)]">UX Research + Psychology</p>
        <h1 className="max-w-2xl text-3xl font-semibold leading-tight sm:text-5xl">
          Build studies fast. Run them on mobile. Watch live insights.
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-[var(--muted)] sm:text-base">
          Create survey logic, publish magic links, and analyze friction in one real-time workspace powered by
          Next.js, Supabase, and Vercel.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="rounded-xl bg-[var(--brand-strong)] px-4 py-2 text-sm font-medium text-white" href="/admin/dashboard">
            Start Building
          </Link>
          <Link className="rounded-xl border border-white/20 px-4 py-2 text-sm" href="/participant/demo">
            View Participant Flow
          </Link>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {["Dashboard", "Lab Builder", "Audience Manager"].map((item) => (
          <article className="glass-panel rounded-2xl p-4" key={item}>
            <h2 className="text-base font-medium">{item}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Mobile-first interactions and role-based access from a single workflow.
            </p>
          </article>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <article className="glass-panel rounded-2xl p-5">
          <h2 className="text-lg font-semibold">For UX Researchers & Designers</h2>
          <ul className="mt-3 grid gap-2 text-sm text-[var(--muted)]">
            <li>First-click testing and embedded prototype validation</li>
            <li>Friction alerts and task success analytics</li>
            <li>Audience segmentation and no-account mobile participation</li>
          </ul>
        </article>
        <article className="glass-panel rounded-2xl p-5">
          <h2 className="text-lg font-semibold">For Psychologists & Students</h2>
          <ul className="mt-3 grid gap-2 text-sm text-[var(--muted)]">
            <li>Consent-first runtime with auditable IRB-ready records</li>
            <li>Reaction-time and IAT trial-level capture</li>
            <li>Distribution summaries with export-ready data</li>
          </ul>
        </article>
      </div>
    </section>
  );
}
