 "use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ToolCategory = "all" | "stress" | "mood" | "personality" | "wellbeing";

const TOOL_CARDS = [
  {
    title: "Resilience (BRS)",
    desc: "6 questions, instant local score.",
    href: "/tools/resilience",
    img: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&auto=format&fit=crop&q=60",
    time: "1 min",
    category: "wellbeing" as ToolCategory,
  },
  {
    title: "DASS-21",
    desc: "Depression, anxiety, and stress screening bands.",
    href: "/tools/dass21",
    img: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&auto=format&fit=crop&q=60",
    time: "3 min",
    category: "stress" as ToolCategory,
  },
  {
    title: "Personality (Big Five)",
    desc: "OCEAN-style trait snapshot from 60 items.",
    href: "/tools/personality",
    img: "https://images.unsplash.com/photo-1526498460520-4c246339dccb?w=1200&auto=format&fit=crop&q=60",
    time: "8 min",
    category: "personality" as ToolCategory,
  },
  {
    title: "PHQ-9 mood check",
    desc: "Short depression symptom screener.",
    href: "/tools/phq9",
    img: "https://images.unsplash.com/photo-1476908965434-9d8505f8cccf?w=1200&auto=format&fit=crop&q=60",
    time: "2 min",
    category: "mood" as ToolCategory,
  },
  {
    title: "GAD-7 anxiety check",
    desc: "7-item anxiety symptom screener.",
    href: "/tools/gad7",
    img: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&auto=format&fit=crop&q=60",
    time: "2 min",
    category: "stress" as ToolCategory,
  },
  {
    title: "WHO-5 wellbeing",
    desc: "Positive wellbeing snapshot.",
    href: "/tools/who5",
    img: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&auto=format&fit=crop&q=60",
    time: "1 min",
    category: "wellbeing" as ToolCategory,
  },
];

export default function ToolsDirectoryPage() {
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory>("all");

  const filteredCards = useMemo(() => {
    if (selectedCategory === "all") return TOOL_CARDS;
    return TOOL_CARDS.filter((card) => card.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <section className="grid gap-4 sm:gap-6">
      <div className="glass-panel rounded-3xl p-5 sm:p-10">
        <p className="mb-3 text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Public self-checks</p>
        <h1 className="max-w-3xl text-3xl font-semibold leading-tight sm:text-5xl">Choose a quick questionnaire</h1>
        <p className="mt-4 max-w-3xl text-sm text-[var(--muted)] sm:text-base">
          All tools are privacy-first and scored instantly on your device. No sign-up needed.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {[
            { id: "all", label: "All" },
            { id: "stress", label: "Stress" },
            { id: "mood", label: "Mood" },
            { id: "personality", label: "Personality" },
            { id: "wellbeing", label: "Wellbeing" },
          ].map((c) => (
            <button
              key={c.id}
              type="button"
              data-selected={selectedCategory === c.id}
              onClick={() => setSelectedCategory(c.id as ToolCategory)}
              className="option-btn rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em]"
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredCards.map((card) => (
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
                <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-white/40">{card.category}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4">
              <span className="text-[10px] uppercase tracking-[0.25em] text-white/30">{card.time}</span>
              <span className="text-xs text-[var(--brand)] font-semibold">Open →</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

