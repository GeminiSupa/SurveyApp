"use client";

import { QuizRunner } from "@/app/(marketing)/tools/_components/quiz-runner";
import { ResultCard } from "@/app/(marketing)/tools/_components/result-card";
import { dass21Quiz, scoreDass21 } from "@/lib/tools/dass21";

function toneFor(label: string) {
  if (label === "Normal") return "emerald" as const;
  if (label === "Mild") return "amber" as const;
  if (label === "Moderate") return "violet" as const;
  if (label === "Severe") return "rose" as const;
  return "rose" as const;
}

export default function Dass21ToolPage() {
  return (
    <QuizRunner
      quiz={dass21Quiz}
      introBullets={[
        "Rate how much each statement applied to you over the past week.",
        "0 means “did not apply to me”; 3 means “applied very much / most of the time”.",
        "Results are computed locally (nothing is saved).",
      ]}
      renderResults={({ answers, restart }) => {
        const r = scoreDass21(answers);
        if (!r) {
          return (
            <ResultCard title="Incomplete" subtitle="Please answer all items to see your results." tone="amber">
              <button
                type="button"
                onClick={restart}
                className="btn-primary rounded-2xl px-6 py-4 text-sm font-semibold"
              >
                Start over
              </button>
            </ResultCard>
          );
        }

        return (
          <ResultCard title="Your DASS-21 results" subtitle="These are screening bands, not a diagnosis." tone="blue">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { name: "Depression", ...r.depression },
                { name: "Anxiety", ...r.anxiety },
                { name: "Stress", ...r.stress },
              ].map((s) => (
                <div key={s.name} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{s.name}</p>
                    <span className={`band-chip band-${toneFor(s.label)}`}>{s.label}</span>
                  </div>
                  <p className="mt-3 text-xs text-white/40">Score (raw × 2)</p>
                  <p className="mt-1 text-3xl font-bold tabular-nums">{s.doubled}</p>
                  <p className="mt-2 text-xs text-[var(--muted)]">Raw: {s.raw}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
              If you’re in distress, please consider contacting a qualified professional or local crisis services.
            </div>

            <div className="mt-6">
              <button type="button" onClick={restart} className="rounded-2xl border border-white/15 px-6 py-3 text-sm">
                Retake
              </button>
            </div>
          </ResultCard>
        );
      }}
    />
  );
}

