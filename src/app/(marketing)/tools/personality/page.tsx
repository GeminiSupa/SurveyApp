"use client";

import { QuizRunner } from "@/app/(marketing)/tools/_components/quiz-runner";
import { ResultCard } from "@/app/(marketing)/tools/_components/result-card";
import { bigFiveQuiz, scoreBigFive } from "@/lib/tools/big-five";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function toneForBand(band: "low" | "average" | "high") {
  if (band === "high") return "emerald" as const;
  if (band === "average") return "amber" as const;
  return "rose" as const;
}

export default function PersonalityToolPage() {
  return (
    <QuizRunner
      quiz={bigFiveQuiz}
      introBullets={[
        "Answer quickly; first instinct is usually best.",
        "Agree/Disagree items are scored and normalized per trait.",
        "Results are computed locally (nothing is saved).",
      ]}
      renderResults={({ answers, restart }) => {
        const r = scoreBigFive(answers);
        if (!r) {
          return (
            <ResultCard title="Incomplete" subtitle="Please answer all items to see your results." tone="amber">
              <button type="button" onClick={restart} className="btn-primary rounded-2xl px-6 py-4 text-sm font-semibold">
                Start over
              </button>
            </ResultCard>
          );
        }

        const chart = r.traits.map((t) => ({ trait: t.name, score: t.score0to100 }));

        return (
          <ResultCard title="Your Big Five snapshot" subtitle="A quick OCEAN-style profile (normalized 0–100)." tone="violet">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[10px] uppercase tracking-widest text-white/30">Trait scores</p>
                <div className="mt-3 h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chart} margin={{ left: 10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="trait" tick={{ fill: "#ffffff80", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fill: "#ffffff60", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: "#ffffff05" }}
                        contentStyle={{ backgroundColor: "#111", border: "1px solid #333", borderRadius: "8px", fontSize: "12px" }}
                      />
                      <Bar dataKey="score" fill="var(--brand-strong)" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid gap-3">
                {r.traits.map((t) => (
                  <div key={t.trait} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{t.name}</p>
                      <span className={`band-chip band-${toneForBand(t.band)}`}>{t.band.toUpperCase()}</span>
                    </div>
                    <p className="mt-2 text-xs text-white/40">Score</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums">{t.score0to100}</p>
                    <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">{t.blurb}</p>
                  </div>
                ))}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-[var(--muted)]">
                  Scoring note: this question set isn’t evenly split across traits, so each trait is normalized to 0–100 based on how many items mapped to it.
                </div>
                <button type="button" onClick={restart} className="rounded-2xl border border-white/15 px-6 py-3 text-sm">
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

