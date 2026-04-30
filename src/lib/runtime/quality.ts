export function computeSpeederFlag(durationMs: number) {
  // Conservative default: under 8s for a multi-block study is suspicious.
  return durationMs > 0 && durationMs < 8000;
}

export function computeStraightLiningFlag(likertValues: number[]) {
  if (likertValues.length < 4) return false;
  const first = likertValues[0];
  return likertValues.every((v) => v === first);
}

export function clampReactionTime(rt: number) {
  // Common RT cleaning window: [150ms, 3000ms]
  if (rt < 150) return 150;
  if (rt > 3000) return 3000;
  return rt;
}

type IatTrial = {
  trial_type?: string;
  reaction_time_ms?: number | null;
  is_correct?: boolean | null;
  participant_session_id?: string | null;
  payload?: Record<string, unknown> | null;
};

export type IatThresholds = {
  fastTrialRtMs: number;
  fastTrialRateThreshold: number; // ratio e.g. 0.1
  errorRateThreshold: number; // ratio e.g. 0.3
  minTrialCount: number;
  exclusionRtLowerMs: number;
  exclusionRtUpperMs: number;
  errorPenaltyMs: number;
};

export const DEFAULT_IAT_THRESHOLDS: IatThresholds = {
  fastTrialRtMs: 300,
  fastTrialRateThreshold: 0.1,
  errorRateThreshold: 0.3,
  minTrialCount: 12,
  exclusionRtLowerMs: 300,
  exclusionRtUpperMs: 3000,
  errorPenaltyMs: 600,
};

export function readIatThresholds(config?: Record<string, unknown> | null): IatThresholds {
  const raw = (config?.iatThresholds ?? {}) as Record<string, unknown>;
  const num = (value: unknown, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return {
    fastTrialRtMs: num(raw.fastTrialRtMs, DEFAULT_IAT_THRESHOLDS.fastTrialRtMs),
    fastTrialRateThreshold: num(raw.fastTrialRateThreshold, DEFAULT_IAT_THRESHOLDS.fastTrialRateThreshold),
    errorRateThreshold: num(raw.errorRateThreshold, DEFAULT_IAT_THRESHOLDS.errorRateThreshold),
    minTrialCount: num(raw.minTrialCount, DEFAULT_IAT_THRESHOLDS.minTrialCount),
    exclusionRtLowerMs: num(raw.exclusionRtLowerMs, DEFAULT_IAT_THRESHOLDS.exclusionRtLowerMs),
    exclusionRtUpperMs: num(raw.exclusionRtUpperMs, DEFAULT_IAT_THRESHOLDS.exclusionRtUpperMs),
    errorPenaltyMs: num(raw.errorPenaltyMs, DEFAULT_IAT_THRESHOLDS.errorPenaltyMs),
  };
}

export function computeIatMetrics(trials: IatTrial[], thresholds: IatThresholds = DEFAULT_IAT_THRESHOLDS) {
  const iatTrials = trials.filter((t) => t.trial_type === "iat");
  if (!iatTrials.length) {
    return {
      trialCount: 0,
      exclusionRate: 0,
      meanCongruentMs: 0,
      meanIncongruentMs: 0,
      dScore: 0,
      errorRate: 0,
    };
  }

  const adjusted = iatTrials.map((t, idx) => {
    const rawRt = Number(t.reaction_time_ms ?? 0);
    const rt = clampReactionTime(rawRt);
    const congruent = Boolean((t.payload ?? {}).congruent);
    const correct = Boolean(t.is_correct);
    const phaseRaw = (t.payload ?? {}).blockPhase;
    const phase = typeof phaseRaw === "string" ? phaseRaw : idx < iatTrials.length / 2 ? "practice" : "test";
    const sessionId = t.participant_session_id ?? "unknown";
    // Greenwald-style simple penalty approximation for incorrect responses.
    const penalizedRt = correct ? rt : rt + thresholds.errorPenaltyMs;
    return { congruent, rt: penalizedRt, rawRt, correct, phase, sessionId };
  });

  const congruent = adjusted.filter((t) => t.congruent).map((t) => t.rt);
  const incongruent = adjusted.filter((t) => !t.congruent).map((t) => t.rt);
  const all = adjusted.map((t) => t.rt);
  const mean = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const std = (arr: number[]) => {
    if (arr.length < 2) return 1;
    const m = mean(arr);
    const v = arr.reduce((acc, n) => acc + (n - m) ** 2, 0) / (arr.length - 1);
    return Math.sqrt(v) || 1;
  };

  const meanCongruent = mean(congruent);
  const meanIncongruent = mean(incongruent);
  const pooledStd = std(all);
  const dScore = pooledStd ? (meanIncongruent - meanCongruent) / pooledStd : 0;

  const exclusionRate =
    Math.round(
      (adjusted.filter((t) => t.rt <= thresholds.exclusionRtLowerMs || t.rt >= thresholds.exclusionRtUpperMs).length /
        Math.max(1, adjusted.length)) *
        100,
    ) || 0;
  const errorRate =
    Math.round((adjusted.filter((t) => !t.correct).length / Math.max(1, adjusted.length)) * 100) || 0;

  const phases = Array.from(new Set(adjusted.map((t) => t.phase)));
  const blockScores = phases.map((phase) => {
    const subset = adjusted.filter((t) => t.phase === phase);
    const c = subset.filter((t) => t.congruent).map((t) => t.rt);
    const i = subset.filter((t) => !t.congruent).map((t) => t.rt);
    const allPhase = subset.map((t) => t.rt);
    const meanPhaseC = mean(c);
    const meanPhaseI = mean(i);
    const stdPhase = std(allPhase);
    const d = stdPhase ? (meanPhaseI - meanPhaseC) / stdPhase : 0;
    const phaseError = Math.round((subset.filter((t) => !t.correct).length / Math.max(1, subset.length)) * 100);
    const phaseFast = Math.round(
      (subset.filter((t) => t.rawRt < thresholds.fastTrialRtMs).length / Math.max(1, subset.length)) * 100,
    );
    return {
      phase,
      trialCount: subset.length,
      meanCongruentMs: Math.round(meanPhaseC),
      meanIncongruentMs: Math.round(meanPhaseI),
      dScore: Number(d.toFixed(3)),
      errorRate: phaseError,
      fastTrialRate: phaseFast,
    };
  });

  const sessionIds = Array.from(new Set(adjusted.map((t) => t.sessionId)));
  const sessionExclusions = sessionIds.map((sid) => {
    const subset = adjusted.filter((t) => t.sessionId === sid);
    const fastRate = subset.filter((t) => t.rawRt < thresholds.fastTrialRtMs).length / Math.max(1, subset.length);
    const errRate = subset.filter((t) => !t.correct).length / Math.max(1, subset.length);
    const tooFew = subset.length < thresholds.minTrialCount;
    const reasons = [
      fastRate > thresholds.fastTrialRateThreshold ? "fast_trials_over_threshold" : null,
      errRate > thresholds.errorRateThreshold ? "error_rate_over_threshold" : null,
      tooFew ? "too_few_trials" : null,
    ].filter(Boolean) as string[];
    return {
      participantSessionId: sid,
      trialCount: subset.length,
      fastTrialRatePct: Math.round(fastRate * 100),
      errorRatePct: Math.round(errRate * 100),
      excluded: reasons.length > 0,
      reasons,
    };
  });

  return {
    trialCount: adjusted.length,
    exclusionRate,
    meanCongruentMs: Math.round(meanCongruent),
    meanIncongruentMs: Math.round(meanIncongruent),
    dScore: Number(dScore.toFixed(3)),
    errorRate,
    blockScores,
    sessionExclusions,
    thresholds,
  };
}
