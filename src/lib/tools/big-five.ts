import type { AnswersMap, QuizDefinition } from "./types";

export type BigFiveTrait = "O" | "C" | "E" | "A" | "N";

/** 1-based question index -> single trait + sign (Agree = +sign, Disagree = -sign). */
const TRAIT_MAP: Record<number, { trait: BigFiveTrait; sign: 1 | -1 }> = {
  // Openness
  5: { trait: "O", sign: 1 },
  7: { trait: "O", sign: 1 },
  8: { trait: "O", sign: 1 },
  9: { trait: "O", sign: 1 },
  10: { trait: "O", sign: 1 },
  13: { trait: "O", sign: 1 },
  19: { trait: "O", sign: -1 },
  21: { trait: "O", sign: -1 },
  24: { trait: "O", sign: -1 },
  25: { trait: "O", sign: 1 },
  28: { trait: "O", sign: -1 },
  29: { trait: "O", sign: 1 },
  31: { trait: "O", sign: -1 },
  38: { trait: "O", sign: 1 },
  39: { trait: "O", sign: 1 },
  44: { trait: "O", sign: 1 },
  47: { trait: "O", sign: -1 },
  50: { trait: "O", sign: 1 },
  51: { trait: "O", sign: 1 },
  57: { trait: "O", sign: 1 },
  // Conscientiousness
  1: { trait: "C", sign: 1 },
  2: { trait: "C", sign: 1 },
  12: { trait: "C", sign: 1 },
  14: { trait: "C", sign: -1 },
  20: { trait: "C", sign: -1 },
  22: { trait: "C", sign: 1 },
  27: { trait: "C", sign: 1 },
  30: { trait: "C", sign: 1 },
  34: { trait: "C", sign: 1 },
  55: { trait: "C", sign: 1 },
  58: { trait: "C", sign: 1 },
  // Extraversion
  3: { trait: "E", sign: 1 },
  11: { trait: "E", sign: 1 },
  15: { trait: "E", sign: 1 },
  16: { trait: "E", sign: 1 },
  17: { trait: "E", sign: -1 },
  23: { trait: "E", sign: 1 },
  26: { trait: "E", sign: -1 },
  32: { trait: "E", sign: 1 },
  33: { trait: "E", sign: 1 },
  35: { trait: "E", sign: -1 },
  37: { trait: "E", sign: 1 },
  42: { trait: "E", sign: 1 },
  53: { trait: "E", sign: -1 },
  54: { trait: "E", sign: -1 },
  59: { trait: "E", sign: -1 },
  // Agreeableness
  4: { trait: "A", sign: 1 },
  6: { trait: "A", sign: 1 },
  18: { trait: "A", sign: -1 },
  40: { trait: "A", sign: -1 },
  41: { trait: "A", sign: -1 },
  45: { trait: "A", sign: 1 },
  46: { trait: "A", sign: -1 },
  48: { trait: "A", sign: 1 },
  52: { trait: "A", sign: 1 },
  56: { trait: "A", sign: 1 },
  // Neuroticism
  36: { trait: "N", sign: 1 },
  43: { trait: "N", sign: 1 },
  49: { trait: "N", sign: -1 },
  60: { trait: "N", sign: 1 },
};

const PROMPTS: string[] = [
  "I often make lists and schedules to organize my activities.",
  "I usually complete tasks or projects well before deadlines.",
  "When facing a challenge, my first step is to seek input and advice from others.",
  "I prioritize the feelings of others when making decisions.",
  "I prefer working in a creative environment over one with clear guidelines and responsibilities.",
  "I find it challenging to remain detached when others are experiencing emotional distress.",
  "I think unexpected changes make my days interesting.",
  "I often explain my ideas using metaphors or hypothetical scenarios.",
  "When learning something new, I like to start with the theory and general concepts.",
  "I prefer exploring new possibilities and solutions without sticking to a strict plan.",
  "I prefer social activities over individual ones.",
  "I like to keep my work and personal life separate.",
  "I like starting projects and seeing where my creativity leads over planning everything out first.",
  "I work best under pressure and often complete tasks at the last minute.",
  "I enjoy sharing my excitement and happiness with others.",
  "I tend to express my emotions openly.",
  "I excel in environments where I can work quietly and independently.",
  "I make decisions based on what makes sense rather than what feels right.",
  "I tend to stick to proven methods and reliable routines.",
  "I find that too much planning takes the fun out of life.",
  "In team discussions, I focus on grounding our approach in what we know works.",
  "I find joy in achieving set goals through systematic planning.",
  "I enjoy engaging with new people frequently.",
  "I prefer ordering my favorite dishes rather than trying something new.",
  "I feel invigorated when I can solve complex problems logically.",
  "I usually wait for others to initiate conversations in social settings.",
  "I usually make plans days in advance.",
  "I don't enjoy participating in creative expression, like writing or making music.",
  "I enjoy figuring out the big picture and how my decisions will impact the future.",
  "When working on a group project, I encourage setting clear roles and deadlines from the beginning.",
  "I value practicality over experimental ideas.",
  "During meetings, I like to discuss issues openly and exchange ideas with others.",
  "I enjoy quick chats and frequent check-ins with colleagues throughout the workday.",
  "When solving problems, I start by considering the existing conditions and constraints.",
  "I prefer to stay in the background during social events.",
  "Meeting new people often makes me feel anxious or stressed.",
  "In conversations, I'm quick to respond and enjoy rapid exchanges.",
  "I enjoy finding deeper meanings in the information I come across.",
  "I often think about new ideas and future projects, even when currently working on something.",
  "I think mistakes should have consequences.",
  "I favor effectiveness when making decisions, even if it hurts someone's feelings.",
  "I feel comfortable and confident in social situations, even with people I don't know well.",
  "I tend to act detached to avoid emotional distress.",
  "I appreciate an innovative project that fails over one that succeeds by sticking to tradition.",
  "I empathize easily with others' emotions.",
  "I prefer being correct over being liked for what I say.",
  "I appreciate movies with clear themes and messages rather than those open to interpretation.",
  "I tend to avoid arguing with others, even when I have a different opinion.",
  "I enjoy the adrenaline and focus that come when working under pressure.",
  "I enjoy taking chances and exploring uncharted territories to discover new solutions.",
  "I'm fascinated by complex, detailed and innovative ideas.",
  "I find value in listening and validating the feelings of others.",
  "I like to listen rather than take the lead in group conversations.",
  "I feel most relaxed when I can enjoy my own company.",
  "I feel calm when everything is scheduled and in its place.",
  "I enjoy providing emotional support for my friends when they need it.",
  "I find inspiration and creativity in open-ended approaches rather than a detailed plan.",
  "I prefer a structured approach when learning something new, following a clear plan and guidelines.",
  "I often feel drained after socializing and need time alone to recharge.",
  "I get anxious when I disagree with people.",
];

function assertMapComplete() {
  for (let i = 1; i <= 60; i++) {
    if (!TRAIT_MAP[i]) throw new Error(`Missing Big Five map for question ${i}`);
  }
}
assertMapComplete();

export const bigFiveQuiz: QuizDefinition = {
  id: "big5",
  title: "Big Five personality snapshot",
  subtitle: "60 quick agree/disagree items — see where you land on Openness, Conscientiousness, Extraversion, Agreeableness, and Neuroticism.",
  estimatedMinutes: 8,
  disclaimer:
    "This is an informal Big Five–style snapshot based on your answers, not a clinical assessment. Results stay on your device only. Trait scores are normalized from the item set you answered.",
  questions: PROMPTS.map((prompt, i) => ({
    id: `bf_${i + 1}`,
    kind: "binary" as const,
    index: i + 1,
    prompt,
  })),
};

export type TraitBand = "low" | "average" | "high";

export type TraitScore = {
  trait: BigFiveTrait;
  name: string;
  score0to100: number;
  band: TraitBand;
  blurb: string;
};

export type BigFiveResult = {
  traits: TraitScore[];
  /** Sum of absolute weights per trait for transparency */
  weights: Record<BigFiveTrait, number>;
};

const TRAIT_NAMES: Record<BigFiveTrait, string> = {
  O: "Openness",
  C: "Conscientiousness",
  E: "Extraversion",
  A: "Agreeableness",
  N: "Neuroticism",
};

const BLURBS: Record<BigFiveTrait, Record<TraitBand, string>> = {
  O: {
    low: "You may prefer concrete, familiar approaches over novelty and abstract exploration.",
    average: "You balance curiosity and practicality in how you explore ideas and change.",
    high: "You tend toward imagination, variety, and intellectual or aesthetic curiosity.",
  },
  C: {
    low: "You may prefer flexibility and spontaneity over structure and long-term planning.",
    average: "You mix organization with adaptability depending on context.",
    high: "You tend toward planning, discipline, and follow-through.",
  },
  E: {
    low: "You may recharge alone and prefer quieter or smaller-scale social settings.",
    average: "You balance social energy with solo time in a typical way.",
    high: "You tend toward sociability, stimulation, and outward expression of energy.",
  },
  A: {
    low: "You may prioritize frankness or competition over harmony in some situations.",
    average: "You balance empathy with standing your ground.",
    high: "You tend toward cooperation, trust, and compassion in social choices.",
  },
  N: {
    low: "You may experience emotions with relatively less volatility or worry day to day.",
    average: "Your mood stress sits in a typical range for many people.",
    high: "You may be more sensitive to stress, mood shifts, or worry than average.",
  },
};

function bandFor(score: number): TraitBand {
  if (score < 40) return "low";
  if (score <= 60) return "average";
  return "high";
}

/** Agree = +1, Disagree = -1 toward mapped trait; then normalize to 0–100 per trait. */
export function scoreBigFive(answers: AnswersMap): BigFiveResult | null {
  const sums: Record<BigFiveTrait, number> = { O: 0, C: 0, E: 0, A: 0, N: 0 };
  const weights: Record<BigFiveTrait, number> = { O: 0, C: 0, E: 0, A: 0, N: 0 };

  for (let i = 1; i <= 60; i++) {
    const id = `bf_${i}`;
    const v = answers[id];
    if (v !== 0 && v !== 1) return null;
    const map = TRAIT_MAP[i];
    const contribution = v === 1 ? map.sign : -map.sign;
    sums[map.trait] += contribution;
    weights[map.trait] += 1;
  }

  const traits: TraitScore[] = (["O", "C", "E", "A", "N"] as const).map((trait) => {
    const w = weights[trait];
    const max = w; // max sum if all answers aligned +sign
    const min = -w;
    const raw = sums[trait];
    const score0to100 =
      w === 0 ? 50 : Math.round(((raw - min) / (max - min)) * 100);
    const band = bandFor(score0to100);
    return {
      trait,
      name: TRAIT_NAMES[trait],
      score0to100,
      band,
      blurb: BLURBS[trait][band],
    };
  });

  return { traits, weights };
}
