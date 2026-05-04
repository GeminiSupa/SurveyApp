/** Shared types for marketing-site self-assessment tools (client-only scoring). */

export type QuizStepKind = "intro" | "question" | "results";

export type Likert5Label = { value: number; label: string };

export type QuizQuestionBase = {
  id: string;
  prompt: string;
};

export type Likert5Question = QuizQuestionBase & {
  kind: "likert5";
  /** 1-based item index for help text */
  index: number;
  /** If true, score as (6 - value) before summing */
  reverse?: boolean;
};

export type Likert4Question = QuizQuestionBase & {
  kind: "likert4";
  index: number;
};

export type BinaryQuestion = QuizQuestionBase & {
  kind: "binary";
  index: number;
};

export type QuizQuestion = Likert5Question | Likert4Question | BinaryQuestion;

export type QuizDefinition = {
  id: string;
  title: string;
  subtitle: string;
  estimatedMinutes: number;
  disclaimer: string;
  questions: QuizQuestion[];
};

export type AnswersMap = Record<string, number>;
