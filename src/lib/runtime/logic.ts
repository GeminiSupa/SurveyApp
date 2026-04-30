import type { StudyBlock } from "@/lib/types";

export type LogicRule = {
  id: string;
  source_block_id: string;
  condition: Record<string, unknown>;
  target_block_id: string | null;
  terminate: boolean;
};

export type DisqualificationRule = {
  id: string;
  condition: Record<string, unknown>;
  disqualify_message: string;
};

export type RandomizationRule = {
  id: string;
  block_group: unknown;
  method: "shuffle" | "rotate";
};

export type ResponseMap = Record<string, unknown>;

function getNumber(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  return null;
}

export function matchesCondition(condition: Record<string, unknown>, responses: ResponseMap): boolean {
  // Supported condition shapes (research-grade minimal):
  // 1) { questionKey, op: "eq"|"neq"|"lt"|"lte"|"gt"|"gte", value }
  // 2) { all: [cond...]} or { any: [cond...] }
  const all = condition.all;
  const any = condition.any;
  if (Array.isArray(all)) {
    return all.every((c) => typeof c === "object" && c !== null && matchesCondition(c as Record<string, unknown>, responses));
  }
  if (Array.isArray(any)) {
    return any.some((c) => typeof c === "object" && c !== null && matchesCondition(c as Record<string, unknown>, responses));
  }

  const questionKey = condition.questionKey;
  const op = condition.op;
  const value = condition.value;
  if (typeof questionKey !== "string" || typeof op !== "string") return false;
  const actual = responses[questionKey];

  if (op === "eq") return actual === value;
  if (op === "neq") return actual !== value;

  const actualNum = getNumber(actual);
  const valueNum = getNumber(value);
  if (actualNum === null || valueNum === null) return false;

  if (op === "lt") return actualNum < valueNum;
  if (op === "lte") return actualNum <= valueNum;
  if (op === "gt") return actualNum > valueNum;
  if (op === "gte") return actualNum >= valueNum;

  return false;
}

export function applyLogicNextBlockId(args: {
  currentBlockId: string;
  rules: LogicRule[];
  responses: ResponseMap;
}): { nextBlockId: string | null; terminate: boolean } {
  const candidates = args.rules.filter((r) => r.source_block_id === args.currentBlockId);
  for (const rule of candidates) {
    if (matchesCondition(rule.condition, args.responses)) {
      if (rule.terminate) return { nextBlockId: null, terminate: true };
      return { nextBlockId: rule.target_block_id, terminate: false };
    }
  }
  return { nextBlockId: null, terminate: false };
}

export function isDisqualified(rules: DisqualificationRule[], responses: ResponseMap) {
  for (const rule of rules) {
    if (matchesCondition(rule.condition, responses)) {
      return { disqualified: true, message: rule.disqualify_message };
    }
  }
  return { disqualified: false, message: "" };
}

function seededRng(seed: number) {
  // mulberry32
  let t = seed >>> 0;
  return function rand() {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleBlocksDeterministic(blocks: StudyBlock[], seedString: string) {
  let seed = 0;
  for (let i = 0; i < seedString.length; i += 1) seed = (seed * 31 + seedString.charCodeAt(i)) >>> 0;
  const rand = seededRng(seed);
  const copy = [...blocks];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
