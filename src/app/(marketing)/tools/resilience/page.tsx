"use client";

import { QuizRunner } from "@/app/(marketing)/tools/_components/quiz-runner";
import { ResultCard } from "@/app/(marketing)/tools/_components/result-card";
import { brsQuiz, scoreBrs } from "@/lib/tools/brs";

export default function ResilienceToolPage() {
  return (
    <QuizRunner
      quiz={brsQuiz}
      introBullets={[
        "6 quick statements; choose what fits you best.",
        "Scores are computed locally (nothing is saved).",
      ]}
      renderResults={({ answers, restart }) => {
        const r = scoreBrs(answers);
        const tone = r.band === "high" ? "emerald" : r.band === "normal" ? "amber" : "rose";
        return (
          <ResultCard title={`Your resilience score: ${r.mean.toFixed(2)} / 5`} subtitle={r.label} tone={tone}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[10px] uppercase tracking-widest text-white/30">Interpretation</p>
                <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">{r.description}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[10px] uppercase tracking-widest text-white/30">What next</p>
                <ul className="mt-2 grid gap-2 text-sm text-[var(--muted)]">
                  <li>- If you want to track change, retake in 2–4 weeks.</li>
                  <li>- Consider sleep, movement, and social support as baseline levers.</li>
                  <li>- If you feel stuck, a professional can help you build coping skills.</li>
                </ul>
                <button
                  type="button"
                  onClick={restart}
                  className="mt-4 rounded-xl border border-white/15 px-4 py-2 text-sm"
                >
                  Retake
                </button>
              </div>
            </div>
          </ResultCard>
        );
      }}
    />
  );
}

