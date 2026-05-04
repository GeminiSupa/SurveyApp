"use client";

import { QuizRunner } from "@/app/(marketing)/tools/_components/quiz-runner";
import { ResultCard } from "@/app/(marketing)/tools/_components/result-card";
import { phq9Quiz, scorePhq9 } from "@/lib/tools/phq9";

function toneFor(label: string) {
  if (label === "Minimal") return "emerald" as const;
  if (label === "Mild") return "amber" as const;
  if (label === "Moderate") return "violet" as const;
  return "rose" as const;
}

export default function Phq9ToolPage() {
  return (
    <QuizRunner
      quiz={phq9Quiz}
      introBullets={[
        "Think about the last two weeks.",
        "Choose the answer that best reflects your recent experience.",
        "Results are computed locally (nothing is saved).",
      ]}
      renderResults={({ answers, restart }) => {
        const result = scorePhq9(answers);
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
          <ResultCard title={`PHQ-9 score: ${result.total}/27`} subtitle={result.label} tone={toneFor(result.label)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[10px] uppercase tracking-widest text-white/30">Interpretation</p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  This is a screening signal only. If symptoms are persistent or worsening, talk to a qualified professional.
                </p>
              </div>
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
                If you have thoughts of self-harm or feel unsafe, contact emergency or crisis support immediately.
              </div>
            </div>
          </ResultCard>
        );
      }}
    />
  );
}

