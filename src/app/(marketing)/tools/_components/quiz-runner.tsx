"use client";

import React, { useMemo, useState } from "react";
import type { AnswersMap, QuizDefinition, QuizQuestion } from "@/lib/tools/types";
import { ArrowLeft, ArrowRight, Copy, RotateCcw } from "lucide-react";

type Step = "intro" | "questions" | "results";

function clamp01(n: number) {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function defaultOptionsFor(q: QuizQuestion): Array<{ value: number; label: string }> {
  if (q.kind === "binary") {
    return [
      { value: 0, label: "Disagree" },
      { value: 1, label: "Agree" },
    ];
  }
  if (q.kind === "likert4") {
    return [
      { value: 0, label: "0" },
      { value: 1, label: "1" },
      { value: 2, label: "2" },
      { value: 3, label: "3" },
    ];
  }
  return [
    { value: 1, label: "1" },
    { value: 2, label: "2" },
    { value: 3, label: "3" },
    { value: 4, label: "4" },
    { value: 5, label: "5" },
  ];
}

export function QuizRunner({
  quiz,
  renderResults,
  introBullets = [],
}: {
  quiz: QuizDefinition;
  introBullets?: string[];
  renderResults: (args: { answers: AnswersMap; restart: () => void }) => React.ReactNode;
}) {
  const [step, setStep] = useState<Step>("intro");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswersMap>({});
  const [note, setNote] = useState<string>("");
  const total = quiz.questions.length;
  const q = quiz.questions[idx];

  const answeredCount = useMemo(() => {
    let n = 0;
    for (const question of quiz.questions) {
      if (answers[question.id] !== undefined) n++;
    }
    return n;
  }, [answers, quiz.questions]);

  const progress = useMemo(() => {
    if (!total) return 0;
    return Math.round(clamp01(answeredCount / total) * 100);
  }, [answeredCount, total]);

  function restart() {
    setStep("intro");
    setIdx(0);
    setAnswers({});
    setNote("");
  }

  function goNext() {
    if (!q) return;
    setNote("");
    if (answers[q.id] === undefined) {
      setNote("Please select an answer to continue.");
      return;
    }
    if (idx < total - 1) {
      setIdx((v) => v + 1);
      return;
    }
    setStep("results");
  }

  function goBack() {
    setNote("");
    if (step === "results") {
      setStep("questions");
      return;
    }
    if (idx > 0) setIdx((v) => v - 1);
    else setStep("intro");
  }

  async function copyShareText() {
    const text = `${quiz.title}\n${quiz.subtitle}\n\nI just took a quick self-check on Survey Lab.\nResults were computed locally on my device.`;
    try {
      await navigator.clipboard.writeText(text);
      setNote("Copied.");
      setTimeout(() => setNote(""), 1200);
    } catch {
      setNote("Copy failed in this browser.");
    }
  }

  if (step === "results") {
    return (
      <section className="grid gap-4 sm:gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={goBack} className="rounded-xl border border-white/15 px-4 py-2 text-sm">
            <span className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </span>
          </button>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copyShareText} className="rounded-xl border border-white/15 px-4 py-2 text-sm">
              <span className="inline-flex items-center gap-2">
                <Copy className="h-4 w-4" /> Copy
              </span>
            </button>
            <button type="button" onClick={restart} className="rounded-xl border border-white/15 px-4 py-2 text-sm">
              <span className="inline-flex items-center gap-2">
                <RotateCcw className="h-4 w-4" /> Restart
              </span>
            </button>
          </div>
        </div>
        {note ? <p className="text-sm text-[var(--muted)]">{note}</p> : null}
        {renderResults({ answers, restart })}
      </section>
    );
  }

  if (step === "intro") {
    return (
      <section className="grid gap-4 sm:gap-6">
        <div className="glass-panel rounded-3xl p-5 sm:p-10">
          <p className="mb-3 text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Self-check tool</p>
          <h1 className="max-w-3xl text-3xl font-semibold leading-tight sm:text-5xl">{quiz.title}</h1>
          <p className="mt-4 max-w-3xl text-sm text-[var(--muted)] sm:text-base">{quiz.subtitle}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] uppercase tracking-widest text-white/30">Time</p>
              <p className="mt-1 text-sm font-semibold">{quiz.estimatedMinutes} min</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] uppercase tracking-widest text-white/30">Privacy</p>
              <p className="mt-1 text-sm font-semibold">Local only</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] uppercase tracking-widest text-white/30">Items</p>
              <p className="mt-1 text-sm font-semibold">{quiz.questions.length}</p>
            </div>
          </div>
          {introBullets.length ? (
            <ul className="mt-6 grid gap-2 text-sm text-[var(--muted)]">
              {introBullets.map((b) => (
                <li key={b}>- {b}</li>
              ))}
            </ul>
          ) : null}
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-[var(--muted)]">{quiz.disclaimer}</div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setStep("questions");
                setIdx(0);
                setNote("");
              }}
              className="btn-primary rounded-2xl px-6 py-4 text-sm font-semibold"
            >
              Start
            </button>
            <button type="button" onClick={restart} className="rounded-2xl border border-white/15 px-6 py-4 text-sm">
              Reset
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (!q) return null;
  const options = defaultOptionsFor(q);
  const current = answers[q.id];

  return (
    <section className="grid gap-4 sm:gap-6">
      <div className="mb-1 h-2 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--brand-strong)] to-[var(--brand)] transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="glass-panel rounded-3xl p-5 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] uppercase tracking-[0.4em] text-[var(--brand)] font-black opacity-70">{quiz.id}</p>
          <p className="text-[10px] text-white/30 font-mono">
            ITEM {q.index}/{total}
          </p>
        </div>
        <h2 className="mt-6 whitespace-pre-wrap text-xl font-semibold leading-snug sm:text-2xl">{q.prompt}</h2>

        <div className="mt-6 grid gap-3">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              data-selected={current === opt.value}
              className="option-btn flex items-center justify-between rounded-2xl px-5 py-4 text-left text-base font-medium"
              onClick={() => {
                setNote("");
                setAnswers((prev) => ({ ...prev, [q.id]: opt.value }));
              }}
            >
              <span className="flex-1 break-words pr-4">{opt.label}</span>
              <span className="text-[10px] font-mono text-white/30">{current === opt.value ? "SELECTED" : ""}</span>
            </button>
          ))}
        </div>

        {note ? <p className="mt-4 text-sm text-rose-400">{note}</p> : null}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={goBack} className="rounded-2xl border border-white/15 px-5 py-3 text-sm">
            <span className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </span>
          </button>
          <button type="button" onClick={goNext} className="btn-primary rounded-2xl px-6 py-3 text-sm font-semibold">
            <span className="inline-flex items-center gap-2">
              {idx === total - 1 ? "See results" : "Next"} <ArrowRight className="h-4 w-4" />
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}

