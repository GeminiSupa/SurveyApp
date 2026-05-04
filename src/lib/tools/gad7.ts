import type { AnswersMap, QuizDefinition } from "./types";

const GAD7_ITEMS = [
  "Feeling nervous, anxious, or on edge.",
  "Not being able to stop or control worrying.",
  "Worrying too much about different things.",
  "Trouble relaxing.",
  "Being so restless that it is hard to sit still.",
  "Becoming easily annoyed or irritable.",
  "Feeling afraid as if something awful might happen.",
];

export const gad7Quiz: QuizDefinition = {
  id: "gad7",
  title: "GAD-7 anxiety check",
  subtitle: "7-item anxiety symptom screener for a quick stress signal.",
  estimatedMinutes: 2,
  disclaimer:
    "GAD-7 is a screening questionnaire, not a diagnosis. Results stay on your device only. If anxiety is affecting safety or daily life, consider professional support.",
  questions: GAD7_ITEMS.map((prompt, i) => ({
    id: `gad7_${i + 1}`,
    kind: "likert4" as const,
    index: i + 1,
    prompt,
  })),
};

export type Gad7Band = "minimal" | "mild" | "moderate" | "severe";

export function scoreGad7(answers: AnswersMap): { total: number; band: Gad7Band; label: string } | null {
  let total = 0;
  for (let i = 1; i <= 7; i++) {
    const value = answers[`gad7_${i}`];
    if (value === undefined || value < 0 || value > 3) return null;
    total += value;
  }
  if (total <= 4) return { total, band: "minimal", label: "Minimal" };
  if (total <= 9) return { total, band: "mild", label: "Mild" };
  if (total <= 14) return { total, band: "moderate", label: "Moderate" };
  return { total, band: "severe", label: "Severe" };
}

