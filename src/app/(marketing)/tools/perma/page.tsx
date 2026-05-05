"use client";

import { QuizRunner } from "@/app/(marketing)/tools/_components/quiz-runner";
import { ResultCard } from "@/app/(marketing)/tools/_components/result-card";
import { permaQuiz, scorePerma } from "@/lib/tools/perma";

export default function PermaToolPage() {
  return (
    <QuizRunner
      quiz={permaQuiz}
      introBullets={[
        "15 items covering Positive Emotion, Engagement, Relationships, Meaning, and Accomplishment.",
        "Scored on a 0–10 scale.",
        "Private and local-only scoring.",
      ]}
      renderResults={({ answers, restart }) => {
        const r = scorePerma(answers);
        if (!r) return null;

        return (
          <div className="grid gap-6">
            <ResultCard title={`Overall Well-being: ${r.overall.toFixed(1)} / 10`} subtitle="Your PERMA Profile" tone="emerald">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: "Positive Emotion", score: r.p, color: "bg-blue-500" },
                  { label: "Engagement", score: r.e, color: "bg-purple-500" },
                  { label: "Relationships", score: r.r, color: "bg-rose-500" },
                  { label: "Meaning", score: r.m, color: "bg-amber-500" },
                  { label: "Accomplishment", score: r.a, color: "bg-emerald-500" },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[10px] uppercase tracking-widest text-white/30">{item.label}</p>
                    <div className="mt-3 flex items-end justify-between">
                      <p className="text-2xl font-bold">{item.score.toFixed(1)}</p>
                      <p className="text-[10px] text-white/20">/ 10</p>
                    </div>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                      <div
                        className={`h-full rounded-full ${item.color} transition-all duration-1000`}
                        style={{ width: `${item.score * 10}%` }}
                      />
                    </div>
                  </div>
                ))}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col justify-center items-center text-center">
                   <button
                    type="button"
                    onClick={restart}
                    className="rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/5 transition-colors"
                  >
                    Retake assessment
                  </button>
                </div>
              </div>
            </ResultCard>

            <article className="glass-panel rounded-3xl p-6 sm:p-8">
              <h2 className="text-lg font-semibold">Understanding your PERMA profile</h2>
              <p className="mt-4 text-sm text-[var(--muted)] leading-relaxed">
                The PERMA model was developed by Martin Seligman. It represents the five core element of psychological well-being and happiness.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold text-white/80">P - Positive Emotion</h3>
                  <p className="mt-1 text-xs text-[var(--muted)]">Feeling good, pleasure, and comfort.</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white/80">E - Engagement</h3>
                  <p className="mt-1 text-xs text-[var(--muted)]">Being fully absorbed in activities (Flow).</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white/80">R - Relationships</h3>
                  <p className="mt-1 text-xs text-[var(--muted)]">Authentic connections with others.</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white/80">M - Meaning</h3>
                  <p className="mt-1 text-xs text-[var(--muted)]">Purpose and serving something bigger than yourself.</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white/80">A - Accomplishment</h3>
                  <p className="mt-1 text-xs text-[var(--muted)]">Success, winning, and mastery.</p>
                </div>
              </div>
            </article>
          </div>
        );
      }}
    />
  );
}
