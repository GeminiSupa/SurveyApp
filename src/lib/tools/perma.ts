import type { AnswersMap, QuizDefinition } from "./types";

const PERMA_ITEMS = [
  { id: "p1", text: "In general, how often do you feel joyful?", category: "P" },
  { id: "p2", text: "In general, how often do you feel positive?", category: "P" },
  { id: "p3", text: "In general, how often do you feel contented?", category: "P" },
  { id: "e1", text: "How often do you become absorbed in what you are doing?", category: "E" },
  { id: "e2", text: "In general, to what extent do you feel excited and interested in things?", category: "E" },
  { id: "e3", text: "How often do you lose track of time while you are doing something you enjoy?", category: "E" },
  { id: "r1", text: "To what extent do you receive help and support from others when you need it?", category: "R" },
  { id: "r2", text: "To what extent do you feel loved?", category: "R" },
  { id: "r3", text: "How satisfied are you with your personal relationships?", category: "R" },
  { id: "m1", text: "To what extent do you feel that what you do in your life is valuable and worthwhile?", category: "M" },
  { id: "m2", text: "In general, to what extent do you feel that your life has a sense of direction?", category: "M" },
  { id: "m3", text: "To what extent do you feel that your life has a sense of purpose?", category: "M" },
  { id: "a1", text: "How much of the time do you feel you are making progress towards accomplishing your goals?", category: "A" },
  { id: "a2", text: "How often do you achieve the important goals you have set for yourself?", category: "A" },
  { id: "a3", text: "To what extent do you feel able to handle your responsibilities?", category: "A" },
];

export const permaQuiz: QuizDefinition = {
  id: "perma",
  title: "PERMA Well-being Profile",
  subtitle: "A comprehensive look at the 5 building blocks of well-being (15 items).",
  estimatedMinutes: 4,
  disclaimer: "This is a self-check tool based on the PERMA model. It is not a clinical diagnosis. Results stay on your device.",
  questions: PERMA_ITEMS.map((item, i) => ({
    id: item.id,
    kind: "likert11" as any, // We'll need to make sure the runner handles 0-10
    index: i + 1,
    prompt: item.text,
  })),
};

export type PermaResult = {
  p: number;
  e: number;
  r: number;
  m: number;
  a: number;
  overall: number;
};

export function scorePerma(answers: AnswersMap): PermaResult | null {
  const scores: Record<string, number[]> = { P: [], E: [], R: [], M: [], A: [] };
  
  for (const item of PERMA_ITEMS) {
    const val = answers[item.id];
    if (val === undefined || typeof val !== "number") return null;
    scores[item.category].push(val);
  }

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  const result = {
    p: avg(scores.P),
    e: avg(scores.E),
    r: avg(scores.R),
    m: avg(scores.M),
    a: avg(scores.A),
    overall: 0,
  };
  
  result.overall = (result.p + result.e + result.r + result.m + result.a) / 5;
  
  return result;
}
