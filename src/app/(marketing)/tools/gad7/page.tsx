"use client";

import { QuizRunner } from "@/app/(marketing)/tools/_components/quiz-runner";
import { ResultCard } from "@/app/(marketing)/tools/_components/result-card";
import { gad7Quiz, scoreGad7 } from "@/lib/tools/gad7";

function toneFor(label: string) {
  if (label === "Minimal") return "emerald" as const;
  if (label === "Mild") return "amber" as const;
  if (label === "Moderate") return "violet" as const;
  return "rose" as const;
}

export default function Gad7ToolPage() {
  return (
    <QuizRunner
      quiz={gad7Quiz}
      introBullets={[
        "Think about the past two weeks.",
        "This is a quick anxiety symptom check, not a diagnosis.",
        "Results are computed locally (nothing is saved).",
      ]}
      renderResults={({ answers, restart }) => {
        const result = scoreGad7(answers);
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
          <ResultCard title={`GAD-7 score: ${result.total}/21`} subtitle={result.label} tone={toneFor(result.label)}>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] uppercase tracking-widest text-white/30">What this means</p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Anxiety can fluctuate with context, sleep, workload, and support. If this score stays elevated, consider talking with a clinician.
              </p>
            </div>
          </ResultCard>
        );
      }}
    />
  );
}

