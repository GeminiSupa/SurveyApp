import type { AnswersMap, QuizDefinition } from "./types";

/** DASS-21 subscale per item index 1–21 (Lovibond & Lovibond). */
type Subscale = "D" | "A" | "S";

const SUBSCALES: Subscale[] = [
  "S", // 1
  "A", // 2
  "D", // 3
  "A", // 4
  "D", // 5
  "S", // 6
  "A", // 7
  "S", // 8
  "A", // 9
  "D", // 10
  "S", // 11
  "S", // 12
  "D", // 13
  "S", // 14
  "A", // 15
  "D", // 16
  "D", // 17
  "S", // 18
  "A", // 19
  "A", // 20
  "D", // 21
];

const DASS_PROMPTS: string[] = [
  "I found it hard to wind down",
  "I was aware of dryness of my mouth",
  "I couldn't seem to experience any positive feeling at all",
  "I experienced breathing difficulty (eg, excessively rapid breathing, breathlessness in the absence of physical exertion)",
  "I found it difficult to work up the initiative to do things",
  "I tended to over-react to situations",
  "I experienced trembling (eg, in the hands)",
  "I felt that I was using a lot of nervous energy",
  "I was worried about situations in which I might panic and make a fool of myself",
  "I felt that I had nothing to look forward to",
  "I found myself getting agitated",
  "I found it difficult to relax",
  "I felt down-hearted and blue",
  "I was intolerant of anything that kept me from getting on with what I was doing",
  "I felt I was close to panic",
  "I was unable to become enthusiastic about anything",
  "I felt I wasn't worth much as a person",
  "I felt that I was rather touchy",
  "I was aware of the action of my heart in the absence of physical exertion (eg, sense of heart rate increase, heart missing a beat)",
  "I felt scared without any good reason",
  "I felt that life was meaningless",
];

export const dass21Quiz: QuizDefinition = {
  id: "dass21",
  title: "DASS-21",
  subtitle: "Depression, Anxiety and Stress — 21 items (about 3 minutes).",
  estimatedMinutes: 3,
  disclaimer:
    "DASS-21 is a screening questionnaire, not a diagnosis. Results stay on your device only. If you are in distress, contact a qualified mental health professional or local crisis services.",
  questions: DASS_PROMPTS.map((prompt, i) => ({
    id: `dass_${i + 1}`,
    kind: "likert4" as const,
    index: i + 1,
    prompt,
  })),
};

export type SeverityBand =
  | "normal"
  | "mild"
  | "moderate"
  | "severe"
  | "extremely_severe";

export type SubscaleResult = {
  raw: number;
  doubled: number;
  band: SeverityBand;
  label: string;
};

export type Dass21Result = {
  depression: SubscaleResult;
  anxiety: SubscaleResult;
  stress: SubscaleResult;
};

function bandDepression(d: number): { band: SeverityBand; label: string } {
  if (d <= 9) return { band: "normal", label: "Normal" };
  if (d <= 13) return { band: "mild", label: "Mild" };
  if (d <= 20) return { band: "moderate", label: "Moderate" };
  if (d <= 27) return { band: "severe", label: "Severe" };
  return { band: "extremely_severe", label: "Extremely severe" };
}

function bandAnxiety(d: number): { band: SeverityBand; label: string } {
  if (d <= 7) return { band: "normal", label: "Normal" };
  if (d <= 9) return { band: "mild", label: "Mild" };
  if (d <= 14) return { band: "moderate", label: "Moderate" };
  if (d <= 19) return { band: "severe", label: "Severe" };
  return { band: "extremely_severe", label: "Extremely severe" };
}

function bandStress(d: number): { band: SeverityBand; label: string } {
  if (d <= 14) return { band: "normal", label: "Normal" };
  if (d <= 18) return { band: "mild", label: "Mild" };
  if (d <= 25) return { band: "moderate", label: "Moderate" };
  if (d <= 33) return { band: "severe", label: "Severe" };
  return { band: "extremely_severe", label: "Extremely severe" };
}

export function scoreDass21(answers: AnswersMap): Dass21Result | null {
  let dSum = 0;
  let aSum = 0;
  let sSum = 0;
  let dN = 0;
  let aN = 0;
  let sN = 0;

  for (let i = 0; i < 21; i++) {
    const id = `dass_${i + 1}`;
    const v = answers[id];
    if (v === undefined || v < 0 || v > 3) return null;
    const sub = SUBSCALES[i];
    if (sub === "D") {
      dSum += v;
      dN++;
    } else if (sub === "A") {
      aSum += v;
      aN++;
    } else {
      sSum += v;
      sN++;
    }
  }

  if (dN !== 7 || aN !== 7 || sN !== 7) return null;

  const depressionRaw = dSum;
  const anxietyRaw = aSum;
  const stressRaw = sSum;

  const depressionDoubled = depressionRaw * 2;
  const anxietyDoubled = anxietyRaw * 2;
  const stressDoubled = stressRaw * 2;

  const dep = bandDepression(depressionDoubled);
  const anx = bandAnxiety(anxietyDoubled);
  const str = bandStress(stressDoubled);

  return {
    depression: {
      raw: depressionRaw,
      doubled: depressionDoubled,
      band: dep.band,
      label: dep.label,
    },
    anxiety: {
      raw: anxietyRaw,
      doubled: anxietyDoubled,
      band: anx.band,
      label: anx.label,
    },
    stress: {
      raw: stressRaw,
      doubled: stressDoubled,
      band: str.band,
      label: str.label,
    },
  };
}
