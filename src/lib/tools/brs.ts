import type { AnswersMap, QuizDefinition } from "./types";

/** Brief Resilience Scale (BRS-6). Higher mean = higher resilience. Negatively worded items are reverse-scored. */
const BRS_ITEMS: Array<{ prompt: string; reverse: boolean }> = [
  { prompt: "When I have a setback, I have trouble bouncing back.", reverse: true },
  { prompt: "I have a hard time making it through stressful events.", reverse: true },
  { prompt: "It does not take me long to recover from a stressful event.", reverse: false },
  { prompt: "It is hard for me to snap back when something bad happens.", reverse: true },
  { prompt: "I usually come through difficult times with little trouble.", reverse: false },
  { prompt: "I tend to bounce back quickly after hard times.", reverse: false },
];

export const brsQuiz: QuizDefinition = {
  id: "brs",
  title: "Brief Resilience Scale",
  subtitle: "A quick check of how you tend to bounce back from stress (about 1 minute).",
  estimatedMinutes: 1,
  disclaimer:
    "This is a self-screening tool, not a diagnosis. Results stay on your device only. If you are struggling, consider reaching out to a qualified professional.",
  questions: BRS_ITEMS.map((item, i) => ({
    id: `brs_${i + 1}`,
    kind: "likert5" as const,
    index: i + 1,
    prompt: item.prompt,
    reverse: item.reverse,
  })),
};

export type BrsBand = "low" | "normal" | "high";

export type BrsResult = {
  mean: number;
  band: BrsBand;
  label: string;
  description: string;
};

/** Bands approximate common clinical cutoffs for BRS mean (1–5 scale). */
export function scoreBrs(answers: AnswersMap): BrsResult {
  let sum = 0;
  for (let i = 0; i < BRS_ITEMS.length; i++) {
    const id = `brs_${i + 1}`;
    const raw = answers[id];
    if (raw === undefined || raw < 1 || raw > 5) {
      return {
        mean: 0,
        band: "low",
        label: "Incomplete",
        description: "Please answer all items to see your score.",
      };
    }
    const v = BRS_ITEMS[i].reverse ? 6 - raw : raw;
    sum += v;
  }
  const mean = sum / BRS_ITEMS.length;
  let band: BrsBand;
  let label: string;
  let description: string;
  if (mean < 3.0) {
    band = "low";
    label = "Lower resilience band";
    description =
      "Your responses suggest you may find bouncing back from setbacks harder than average right now. Many people fluctuate here during stress—self-care, social support, and professional support can help.";
  } else if (mean < 4.31) {
    band = "normal";
    label = "Typical range";
    description =
      "Your responses fall in a common range for resilience. You likely recover from stress in a balanced way much of the time.";
  } else {
    band = "high";
    label = "Higher resilience band";
    description =
      "Your responses suggest you often recover well from setbacks and stress. Keep doing what works for you.";
  }
  return { mean: Math.round(mean * 100) / 100, band, label, description };
}
