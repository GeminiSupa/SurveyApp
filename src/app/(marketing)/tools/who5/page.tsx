"use client";

import { QuizRunner } from "@/app/(marketing)/tools/_components/quiz-runner";
import { ResultCard } from "@/app/(marketing)/tools/_components/result-card";
import { who5Quiz, scoreWho5 } from "@/lib/tools/who5";

function toneFor(percent: number) {
  if (percent >= 76) return "emerald" as const;
  if (percent >= 52) return "amber" as const;
  if (percent >= 28) return "violet" as const;
  return "rose" as const;
}

export default function Who5ToolPage() {
  return (
    <QuizRunner
      quiz={who5Quiz}
      introBullets={[
        "This one focuses on positive wellbeing, not only symptoms.",
        "Great for a quick baseline and repeat check-ins.",
        "Results are computed locally (nothing is saved).",
      ]}
      renderResults={({ answers, restart }) => {
        const result = scoreWho5(answers);
        if (!result) {
          return (
            <ResultCard title="Incomplete" subtitle="Please answer all items to see your result." tone="amber">
              <button type="button" onClick={restart} className="btn-primary rounded-2xl px-6 py-4 text-sm font-semibold">
                Start over
              </button>
            </ResultCard>
          );
        }
        return (
          <ResultCard title={`WHO-5 wellbeing: ${result.percent}%`} subtitle={result.label} tone={toneFor(result.percent)}>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] uppercase tracking-widest text-white/30">Quick note</p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                WHO-5 is often used as a wellbeing screen and progress tracker. Rechecking after a few weeks can be helpful.
              </p>
            </div>
          </ResultCard>
        );
      }}
    />
  );
}

