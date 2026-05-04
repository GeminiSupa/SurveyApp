import type { AnswersMap, QuizDefinition } from "./types";

const PHQ9_ITEMS = [
  "Little interest or pleasure in doing things.",
  "Feeling down, depressed, or hopeless.",
  "Trouble falling or staying asleep, or sleeping too much.",
  "Feeling tired or having little energy.",
  "Poor appetite or overeating.",
  "Feeling bad about yourself — or that you are a failure or have let yourself or your family down.",
  "Trouble concentrating on things, such as reading the newspaper or watching television.",
  "Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual.",
  "Thoughts that you would be better off dead, or of hurting yourself.",
];

export const phq9Quiz: QuizDefinition = {
  id: "phq9",
  title: "PHQ-9 mood check",
  subtitle: "9-item depression symptom screener used in many settings.",
  estimatedMinutes: 2,
  disclaimer:
    "PHQ-9 is a screening questionnaire, not a diagnosis. Results stay on your device only. If you feel unsafe, seek urgent help from local emergency or crisis services.",
  questions: PHQ9_ITEMS.map((prompt, i) => ({
    id: `phq9_${i + 1}`,
    kind: "likert4" as const,
    index: i + 1,
    prompt,
  })),
};

export type Phq9Band = "minimal" | "mild" | "moderate" | "moderately_severe" | "severe";

export function scorePhq9(answers: AnswersMap): { total: number; band: Phq9Band; label: string } | null {
  let total = 0;
  for (let i = 1; i <= 9; i++) {
    const value = answers[`phq9_${i}`];
    if (value === undefined || value < 0 || value > 3) return null;
    total += value;
  }
  if (total <= 4) return { total, band: "minimal", label: "Minimal" };
  if (total <= 9) return { total, band: "mild", label: "Mild" };
  if (total <= 14) return { total, band: "moderate", label: "Moderate" };
  if (total <= 19) return { total, band: "moderately_severe", label: "Moderately severe" };
  return { total, band: "severe", label: "Severe" };
}

