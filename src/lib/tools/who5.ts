import type { AnswersMap, QuizDefinition } from "./types";

const WHO5_ITEMS = [
  "I have felt cheerful and in good spirits.",
  "I have felt calm and relaxed.",
  "I have felt active and vigorous.",
  "I woke up feeling fresh and rested.",
  "My daily life has been filled with things that interest me.",
];

export const who5Quiz: QuizDefinition = {
  id: "who5",
  title: "WHO-5 wellbeing check",
  subtitle: "5-item positive wellbeing screener for a quick mental wellbeing snapshot.",
  estimatedMinutes: 1,
  disclaimer:
    "WHO-5 is a wellbeing screen, not a diagnosis. Results stay on your device only and can vary over time.",
  questions: WHO5_ITEMS.map((prompt, i) => ({
    id: `who5_${i + 1}`,
    kind: "likert5" as const,
    index: i + 1,
    prompt,
  })),
};

export function scoreWho5(answers: AnswersMap): { raw: number; percent: number; label: string } | null {
  let raw = 0;
  for (let i = 1; i <= 5; i++) {
    const value = answers[`who5_${i}`];
    if (value === undefined || value < 1 || value > 5) return null;
    raw += value - 1; // convert 1-5 UI scale to 0-4 scoring style
  }
  const percent = Math.round((raw / 20) * 100);
  if (percent < 28) return { raw, percent, label: "Low wellbeing signal" };
  if (percent < 52) return { raw, percent, label: "Below-average wellbeing" };
  if (percent < 76) return { raw, percent, label: "Moderate wellbeing" };
  return { raw, percent, label: "High wellbeing" };
}

