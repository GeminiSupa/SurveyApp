import Link from "next/link";

export default function LandingPage() {
  return (
    <section className="grid gap-4 sm:gap-6">
      <div className="glass-panel relative overflow-hidden rounded-3xl p-5 sm:p-10">
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[var(--brand)]/20 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-[var(--brand-strong)]/20 blur-3xl" />
        </div>
        <div className="relative">
          <p className="mb-3 text-xs uppercase tracking-[0.22em] text-[var(--muted)]">UX Research + Psychology</p>
          <h1 className="max-w-3xl text-3xl font-semibold leading-tight sm:text-5xl">
            Build studies fast. Or just explore your own mind in 3 minutes.
          </h1>
          <p className="mt-4 max-w-3xl text-sm text-[var(--muted)] sm:text-base">
            Try instant, privacy-first self-check tools (local-only results), then jump into the full Study Lab
            workspace when you’re ready.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="rounded-xl bg-[var(--brand-strong)] px-4 py-2 text-sm font-medium text-white" href="/tools/resilience">
              Just check your resilience
            </Link>
            <Link className="rounded-xl border border-white/20 px-4 py-2 text-sm" href="/tools/dass21">
              Depression / Anxiety / Stress (DASS-21)
            </Link>
            <Link className="rounded-xl border border-white/20 px-4 py-2 text-sm" href="/tools/personality">
              Personality snapshot (Big Five)
            </Link>
            <Link className="rounded-xl border border-white/20 px-4 py-2 text-sm" href="/tools/phq9">
              PHQ-9 mood check
            </Link>
            <Link className="rounded-xl border border-white/20 px-4 py-2 text-sm" href="/tools/gad7">
              GAD-7 anxiety check
            </Link>
            <Link className="rounded-xl border border-white/20 px-4 py-2 text-sm" href="/tools/who5">
              WHO-5 wellbeing
            </Link>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link className="rounded-xl border border-white/15 px-4 py-2 text-sm" href="/participant/demo">
              View participant flow
            </Link>
            <Link className="rounded-xl border border-white/15 px-4 py-2 text-sm" href="/admin/dashboard">
              Start building studies
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: "Resilience (BRS)",
            desc: "6 questions, instant score, local-only.",
            href: "/tools/resilience",
            img: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&auto=format&fit=crop&q=60",
          },
          {
            title: "DASS-21",
            desc: "Depression, Anxiety, Stress bands (screening).",
            href: "/tools/dass21",
            img: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&auto=format&fit=crop&q=60",
          },
          {
            title: "Personality",
            desc: "Big Five snapshot: O, C, E, A, N.",
            href: "/tools/personality",
            img: "https://images.unsplash.com/photo-1526498460520-4c246339dccb?w=1200&auto=format&fit=crop&q=60",
          },
          {
            title: "PHQ-9",
            desc: "Quick depression symptom screen.",
            href: "/tools/phq9",
            img: "https://images.unsplash.com/photo-1476908965434-9d8505f8cccf?w=1200&auto=format&fit=crop&q=60",
          },
          {
            title: "GAD-7",
            desc: "Short anxiety symptom check.",
            href: "/tools/gad7",
            img: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&auto=format&fit=crop&q=60",
          },
          {
            title: "WHO-5 wellbeing",
            desc: "Positive wellbeing snapshot.",
            href: "/tools/who5",
            img: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&auto=format&fit=crop&q=60",
          },
        ].map((card) => (
          <Link key={card.href} href={card.href} className="tool-card glass-panel group overflow-hidden rounded-3xl">
            <div className="relative aspect-[21/9] sm:aspect-[3/1]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={card.title}
                src={card.img}
                className="h-full w-full object-cover opacity-70 transition-all duration-500 group-hover:opacity-90 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070c1a] via-[#070c1a]/40 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-xs font-semibold text-white">{card.title}</p>
                <p className="mt-1 text-[11px] text-white/60">{card.desc}</p>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.25em] text-white/30">Try now</span>
                <span className="text-xs text-[var(--brand)] font-semibold">Open →</span>
              </div>
            </div>
          </Link>
        ))}
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

      <article className="glass-panel rounded-3xl p-5 sm:p-8">
        <h2 className="text-lg font-semibold">Why these tools?</h2>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          They’re intentionally lightweight: fast, mobile-friendly, and privacy-first. The goal is curiosity—get a
          quick signal, then explore deeper via full studies.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/40">
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">Local-only scoring</span>
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">No account needed</span>
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">Mobile-first UI</span>
        </div>
      </article>
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
