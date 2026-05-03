"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ShieldAlert, ArrowRight, ChevronLeft, ChevronRight, Info, Loader2 } from "lucide-react";
import type { StudyBlock } from "@/lib/types";
import { createRequestId } from "@/lib/security/request-id";
import { enqueueRequest, flushQueue } from "@/lib/runtime/offline-queue";
import {
  applyLogicNextBlockId,
  isDisqualified,
  shuffleBlocksDeterministic,
  type DisqualificationRule,
  type LogicRule,
} from "@/lib/runtime/logic";

type ResponseItem = {
  questionKey: string;
  responseType: "text" | "likert" | "mcq" | "task" | "time_ms";
  textValue?: string;
  numericValue?: number;
  jsonValue?: Record<string, unknown>;
};

type Trial = {
  trialType: "iat" | "reaction_time";
  stimulus: string;
  expectedResponse?: string;
  actualResponse?: string;
  reactionTimeMs?: number;
  isCorrect?: boolean;
  payload?: Record<string, unknown>;
};

export function StudyRunner({
  studyId,
  studyDbId,
  blocks,
  magicToken,
  logicRules,
  disqualificationRules,
}: {
  studyId: string;
  studyDbId: string;
  blocks: StudyBlock[];
  magicToken: string | null;
  logicRules?: LogicRule[];
  disqualificationRules?: DisqualificationRule[];
}) {
  const [idx, setIdx] = useState(0);
  const [consent, setConsent] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [participantToken, setParticipantToken] = useState<string | null>(null);
  const [sessionStartedAt] = useState(() => Date.now());
  const [reactStartAt, setReactStartAt] = useState<number | null>(null);
  const [stimulus, setStimulus] = useState("Wait...");
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [iatIndex, setIatIndex] = useState(0);
  const [iatStimulusShownAt, setIatStimulusShownAt] = useState<number | null>(null);
  const [iatDone, setIatDone] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const [offline, setOffline] = useState(false);
  const [responseMap, setResponseMap] = useState<Record<string, unknown>>({});
  const [isScreenedOut, setIsScreenedOut] = useState(false);
  const [brsRatings, setBrsRatings] = useState<Record<string, number>>({});
  const hasConsentBlock = useMemo(
    () => blocks.some((block) => block.block_type === "consent"),
    [blocks],
  );
  
  // RT specific state
  const [rtTrialIdx, setRtTrialIdx] = useState(0);
  const [rtPhase, setRtPhase] = useState<"idle" | "fixation" | "isi" | "stimulus" | "feedback" | "complete">("idle");
  const [rtStimulus, setRtStimulus] = useState<string | null>(null);
  const [rtFeedback, setRtFeedback] = useState<"correct" | "incorrect" | "late" | null>(null);
  const [rtIsTarget, setRtIsTarget] = useState(false);

  const randomizedBlocks = useMemo(() => {
    if (!participantToken) return blocks;
    if (!blocks.some((b) => typeof b.config?.randomizeGroup === "string")) return blocks;

    const groups = new Map<string, StudyBlock[]>();
    const ungroupped: StudyBlock[] = [];
    for (const b of blocks) {
      const g = b.config?.randomizeGroup;
      if (typeof g === "string" && g) {
        groups.set(g, [...(groups.get(g) ?? []), b]);
      } else {
        ungroupped.push(b);
      }
    }

    const shuffledGroups = Array.from(groups.entries()).flatMap(([g, bs]) =>
      shuffleBlocksDeterministic(bs, `${participantToken}:${g}`),
    );

    return [...ungroupped, ...shuffledGroups];
  }, [blocks, participantToken]);

  const currentBlock = useMemo(() => randomizedBlocks[idx], [randomizedBlocks, idx]);
  const progress = blocks.length ? Math.round(((idx + 1) / blocks.length) * 100) : 0;
  const currentStimuli = Array.isArray(currentBlock?.config?.stimuli) ? currentBlock.config.stimuli : [];
  const iatTrials = useMemo(() => {
    if (currentBlock?.block_type !== "iat")
      return {
        left: "Left",
        right: "Right",
        trials: [] as Array<{ text?: string; category?: string; congruent?: boolean; phase?: string }>,
      };
    const left = String(currentBlock.config?.leftLabel ?? "Left");
    const right = String(currentBlock.config?.rightLabel ?? "Right");
    const raw = currentStimuli;

    const asObjects =
      raw.length && typeof raw[0] === "object" && raw[0] !== null
        ? (raw as Array<{ text?: string; category?: string; congruent?: boolean; phase?: string }>)
        : raw.map((text) => ({
            text: String(text),
            category: Math.random() > 0.5 ? left : right,
            congruent: Math.random() > 0.5,
            phase: undefined,
          }));

    const expanded = asObjects.flatMap((t) => [t, t]); // simple repetition to increase trials
    return { left, right, trials: expanded };
  }, [currentBlock?.block_type, currentStimuli, currentBlock?.config]);

  useEffect(() => {
    async function startSession() {
      if (!studyId) return;
      const response = await fetch("/api/participant/start", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-request-id": createRequestId() },
        body: JSON.stringify({ studyPublicId: studyId, magicToken }),
      });
      const data = (await response.json()) as { sessionId?: string; participantToken?: string; error?: string };
      if (!response.ok || !data.sessionId || !data.participantToken) {
        setStatus("error");
        setMessage(data.error ?? "Could not start session.");
        return;
      }
      setSessionId(data.sessionId);
      setParticipantToken(data.participantToken);

    }
    void startSession();
  }, [studyId, magicToken]);

  useEffect(() => {
    function handleOnline() {
      setOffline(false);
      void flushQueue();
    }
    function handleOffline() {
      setOffline(true);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setOffline(!navigator.onLine);
    if (navigator.onLine) void flushQueue();
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (currentBlock?.block_type !== "reaction_time") {
      setRtPhase("idle");
      setRtTrialIdx(0);
      return;
    }

    const config = currentBlock.config || {};
    const trialCount = Number(config.trialCount || 1);
    
    if (rtTrialIdx >= trialCount) {
      setRtPhase("complete");
      return;
    }

    let timeoutId: any;
    
    // Start Trial
    setRtPhase("fixation");
    setRtFeedback(null);
    
    timeoutId = setTimeout(() => {
      setRtPhase("isi");
      const delay = Number(config.minDelayMs || 500) + Math.random() * (Number(config.maxDelayMs || 1500) - Number(config.minDelayMs || 500));
      
      timeoutId = setTimeout(() => {
        const stimuli = Array.isArray(config.stimuli) ? config.stimuli : ["GO"];
        const targets = Array.isArray(config.targetStimuli) ? config.targetStimuli : ["GO"];
        const stimulus = stimuli[Math.floor(Math.random() * stimuli.length)];
        
        setRtStimulus(stimulus);
        setRtIsTarget(targets.includes(stimulus));
        setRtPhase("stimulus");
        setReactStartAt(performance.now());

        // Auto-fail if too slow
        timeoutId = setTimeout(() => {
          if (rtPhase === "stimulus") {
            handleRtInput(null); // Late
          }
        }, 3000);
      }, delay);
    }, Number(config.fixationMs || 500));

    return () => clearTimeout(timeoutId);
  }, [currentBlock?.id, currentBlock?.block_type, rtTrialIdx]);

  function handleRtInput(input: "tap" | null) {
    if (rtPhase !== "stimulus") return;
    
    const reactionTime = reactStartAt ? performance.now() - reactStartAt : 0;
    const isCorrect = input === "tap" ? rtIsTarget : !rtIsTarget;
    
    setRtFeedback(isCorrect ? "correct" : "incorrect");
    setRtPhase("feedback");

    setTrials((prev) => [...prev, { 
      trialType: "reaction_time", 
      stimulus: rtStimulus || "unknown", 
      actualResponse: input || "none", 
      reactionTimeMs: reactionTime, 
      isCorrect,
      payload: { trialIdx: rtTrialIdx, isTarget: rtIsTarget }
    }]);

    setTimeout(() => {
      setRtTrialIdx(prev => prev + 1);
    }, 800);
  }

  useEffect(() => {
    if (currentBlock?.block_type !== "iat") return;
    setIatIndex(0);
    setIatStimulusShownAt(performance.now());
    setIatDone(false);
  }, [currentBlock?.id, currentBlock?.block_type]);

  async function logEvent(eventType: string, payload: Record<string, unknown>) {
    if (!sessionId || !studyDbId || !participantToken) return;
    const body = { studyId: studyDbId, sessionId, participantToken, eventType, payload };
    const requestId = createRequestId();
    try {
      const res = await fetch("/api/participant/event", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-request-id": requestId },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("event_failed");
    } catch {
      enqueueRequest({ id: requestId, url: "/api/participant/event", method: "POST", body });
      setOffline(true);
    }
  }

  function collectCurrentResponse() {
    if (!currentBlock) return;
    const responseAdditions: ResponseItem[] = [];
    const responseMapAdditions: Record<string, unknown> = {};
    
    // For legacy single questions or multi-questions
    const qs = Array.isArray(currentBlock.config?.questions) 
      ? currentBlock.config.questions 
      : [{ 
          id: currentBlock.id, 
          question: currentBlock.config?.question, 
          surveyType: currentBlock.config?.surveyType, 
          options: currentBlock.config?.options 
        }];

    if (currentBlock.block_type === "survey" || currentBlock.block_type === "multiple_choice") {
      qs.forEach((q: any) => {
        const val = answers[q.id];
        if (val === undefined) return;
        
        let rType: "likert" | "text" | "mcq" = "likert";
        if (currentBlock.block_type === "multiple_choice" || q.surveyType === "mcq") rType = "mcq";
        if (q.surveyType === "open_text") rType = "text";
        
        const qk = String(currentBlock.config?.questionKey ?? `${rType}_${q.id}`);
        responseAdditions.push({
          questionKey: qk, 
          responseType: rType, 
          textValue: rType !== "likert" ? String(val) : undefined,
          numericValue: rType === "likert" ? Number(val) : undefined 
        });
        responseMapAdditions[qk] = val;
      });
    }

    if (currentBlock.block_type === "ux_task") {
      const choice = answers[`ux_${currentBlock.id}`] as string;
      responseAdditions.push({
        questionKey: `ux_${currentBlock.id}`,
        responseType: "task",
        jsonValue: { taskType: currentBlock.config?.taskType ?? "first_click", value: choice || "captured" },
      });
    }
    if (currentBlock.block_type === "reaction_time") {
      // Data already collected in handleRtInput
      const avgRt = trials
        .filter(t => t.trialType === "reaction_time" && t.isCorrect)
        .reduce((acc, t) => acc + (t.reactionTimeMs || 0), 0) / (trials.length || 1);
      
      responseAdditions.push({ 
        questionKey: `rt_${currentBlock.id}`, 
        responseType: "time_ms", 
        numericValue: avgRt,
        jsonValue: { trialCount: trials.length }
      });
    }
    if (currentBlock.block_type === "brs") {
      const items: Array<{ id: string; text: string; reversed: boolean }> = Array.isArray(currentBlock.config?.items) ? currentBlock.config.items : [];
      const scoredItems: Record<string, number> = {};
      let total = 0;
      items.forEach((item) => {
        const raw = brsRatings[item.id] || 0;
        const scored = item.reversed ? (6 - raw) : raw;
        scoredItems[item.id] = scored;
        total += scored;
      });
      const meanScore = items.length > 0 ? total / items.length : 0;
      const qk = `brs_${currentBlock.id}`;
      responseAdditions.push({
        questionKey: qk,
        responseType: "likert",
        numericValue: parseFloat(meanScore.toFixed(2)),
        jsonValue: { rawRatings: brsRatings, scoredItems, meanScore: parseFloat(meanScore.toFixed(2)), itemCount: items.length },
      });
      responseMapAdditions[qk] = meanScore;
    }
    if (responseAdditions.length) {
      setResponses((prev) => [...prev, ...responseAdditions]);
    }
    if (Object.keys(responseMapAdditions).length) {
      setResponseMap((prev) => ({ ...prev, ...responseMapAdditions }));
    }
    return { responseAdditions, responseMapAdditions };
  }

  async function submitCompletion(allResponses: ResponseItem[], completionMessage: string) {
    if (!sessionId || !participantToken) return false;
    setStatus("saving");
    const response = await fetch("/api/participant/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-request-id": createRequestId() },
      body: JSON.stringify({
        studyId: studyDbId,
        sessionId,
        participantToken,
        consentAccepted: hasConsentBlock ? consent : true,
        responses: allResponses,
        trials,
        durationMs: Date.now() - sessionStartedAt,
      }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setStatus("error");
      setMessage(data.error ?? "Submission failed.");
      return false;
    }
    setStatus("saved");
    setMessage(completionMessage);
    return true;
  }

  async function handleNext() {
    if (!currentBlock) return;
    if (currentBlock.block_type === "consent" && !consent) {
      setStatus("error");
      setMessage("Consent is required.");
      return;
    }

    if (currentBlock.block_type === "iat" && !iatDone) {
      setStatus("error");
      setMessage("Complete the IAT trials using the left/right buttons.");
      return;
    }

    if ((currentBlock.block_type === "survey" || currentBlock.block_type === "multiple_choice") && currentBlock.config?.required !== false) {
      const qs = Array.isArray(currentBlock.config?.questions) 
        ? currentBlock.config.questions 
        : [{ id: currentBlock.id }];
        
      const allAnswered = qs.every((q: any) => {
        const val = answers[q.id];
        if (val === undefined || val === null || val === "") return false;
        return true;
      });

      if (!allAnswered) {
        setStatus("error");
        setMessage("Please answer all mandatory questions on this page.");
        return;
      }
    }

    if (currentBlock.block_type === "brs" && currentBlock.config?.required !== false) {
      const items: Array<{ id: string }> = Array.isArray(currentBlock.config?.items) ? currentBlock.config.items : [];
      const unanswered = items.filter((item) => !brsRatings[item.id]);
      if (unanswered.length > 0) {
        setStatus("error");
        setMessage(`Please answer all ${items.length} items. ${unanswered.length} remaining.`);
        return;
      }
    }

    const collected = collectCurrentResponse();
    const nextResponseMap = { ...responseMap, ...(collected?.responseMapAdditions ?? {}) };
    const nextResponses = [...responses, ...(collected?.responseAdditions ?? [])];
    const dq = isDisqualified(disqualificationRules ?? [], nextResponseMap);
    if (dq.disqualified) {
      const completed = await submitCompletion(nextResponses, dq.message || "You do not meet this study's eligibility requirements.");
      if (completed) setIsScreenedOut(true);
      return;
    }
    await logEvent("question_completed", { blockType: currentBlock.block_type, idx });

    const nextDecision = applyLogicNextBlockId({
      currentBlockId: currentBlock.id,
      rules: logicRules ?? [],
      responses: nextResponseMap,
    });
    if (nextDecision.terminate) {
      await submitCompletion(nextResponses, "Thank you. This session has ended.");
      return;
    }

    if (nextDecision.nextBlockId) {
      const nextIdx = randomizedBlocks.findIndex((b) => b.id === nextDecision.nextBlockId);
      if (nextIdx >= 0) {
        setIdx(nextIdx);
        setAnswers({});
        setBrsRatings({});
        setMessage("");
        return;
      }
    }

    if (idx < randomizedBlocks.length - 1) {
      setIdx((value) => value + 1);
      setAnswers({});
      setBrsRatings({});
      setMessage("");
      return;
    }

    await submitCompletion(nextResponses, "Submitted. Thank you for participating.");
  }

  function handleFirstClick(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const cell = Math.min(99, Math.floor((y / rect.height) * 10) * 10 + Math.floor((x / rect.width) * 10));
    void logEvent("first_click", { x, y, xNorm: x / rect.width, yNorm: y / rect.height, cell });
    setAnswers(prev => ({ ...prev, [`ux_${currentBlock?.id}`]: `cell-${cell}` }));
  }

  function answerIat(side: "left" | "right") {
    if (currentBlock?.block_type !== "iat") return;
    if (!iatTrials.trials.length) return;
    const shownAt = iatStimulusShownAt ?? performance.now();
    const rt = performance.now() - shownAt;

    const trial = iatTrials.trials[iatIndex];
    const expectedSide = trial.category === iatTrials.left ? "left" : "right";
    const isCorrect = side === expectedSide;
    const trialPhase =
      typeof trial.phase === "string"
        ? trial.phase
        : iatIndex < Math.ceil(iatTrials.trials.length / 2)
          ? "practice"
          : "test";

    setTrials((prev) => [
      ...prev,
      {
        trialType: "iat",
        stimulus: String(trial.text ?? "Stimulus"),
        expectedResponse: expectedSide,
        actualResponse: side,
        reactionTimeMs: rt,
        isCorrect,
        payload: {
          blockId: currentBlock.id,
          congruent: Boolean(trial.congruent),
          blockPhase: trialPhase,
          leftLabel: iatTrials.left,
          rightLabel: iatTrials.right,
        },
      },
    ]);

    if (iatIndex < iatTrials.trials.length - 1) {
      setIatIndex((v) => v + 1);
      setIatStimulusShownAt(performance.now());
      return;
    }

    // Finished IAT block; allow Next to proceed
    setIatDone(true);
    setMessage("IAT complete. Tap Next to continue.");
  }

  if (!blocks.length) {
    return <section className="rounded-2xl border border-rose-300/20 bg-rose-500/10 p-4 text-sm">No blocks configured for this study.</section>;
  }

  return (
    <section className="flex flex-1 flex-col justify-between animate-step">
      {isScreenedOut ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-6">
          <div className="mx-auto w-24 h-24 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(244,63,94,0.1)]">
            <ShieldAlert className="w-12 h-12 text-rose-500" />
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-bold tracking-tight">Eligibility Notice</h2>
            <p className="text-[var(--muted)] leading-relaxed max-w-sm mx-auto text-base">
              {message || "Sorry, you do not meet the requirements for this specific study."}
            </p>
          </div>
          <div className="pt-8">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/20 font-bold">End of session</p>
          </div>
        </div>
      ) : status === "saved" ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-8">
          <div className="mx-auto w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.1)]">
            <Check className="w-12 h-12 text-emerald-500" />
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-bold tracking-tight">{String(currentBlock?.config?.title || "Thank You")}</h2>
            <p className="text-[var(--muted)] leading-relaxed max-w-sm mx-auto text-lg whitespace-pre-wrap">
              {String(currentBlock?.config?.message || message || "Your responses have been successfully recorded.")}
            </p>
          </div>
          <div className="pt-12">
            <p className="text-xs uppercase tracking-[0.3em] text-white/20 font-bold">You may now close this window</p>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-6">
      {offline ? (
        <div className="mb-4 rounded-2xl border border-amber-300/20 bg-amber-400/5 p-4 text-sm text-amber-200 flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          Offline mode: your progress is saved locally.
        </div>
      ) : null}
      <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-gradient-to-r from-[var(--brand-strong)] to-[var(--brand)] transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 backdrop-blur-sm shadow-2xl transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <p className="text-[10px] uppercase tracking-[0.4em] text-[var(--brand)] font-black opacity-70">{currentBlock.block_type}</p>
          <p className="text-[10px] text-white/30 font-mono">STEP {idx + 1}/{blocks.length}</p>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-8 leading-tight">{currentBlock.label}</h1>

        {currentBlock.block_type === "consent" ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--brand)]">{String(currentBlock.config?.title || "Consent Agreement")}</h2>
            <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              <p className="text-base text-white/80 leading-relaxed whitespace-pre-wrap">
                {String(currentBlock.config?.text || "By participating, you agree to allow us to collect and analyze your anonymized data for research purposes.")}
              </p>
            </div>
            <label className="flex items-center gap-4 p-5 rounded-2xl border border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-all group">
              <input 
                type="checkbox" 
                checked={consent} 
                onChange={(event) => setConsent(event.target.checked)} 
                className="w-5 h-5 rounded border-white/20 bg-transparent text-[var(--brand)] focus:ring-[var(--brand)] focus:ring-offset-0 transition-all"
              />
              <span className="text-base font-semibold group-hover:text-white transition-colors">I understand and consent to the terms</span>
            </label>
          </div>
        ) : null}

        {currentBlock.block_type === "multiple_choice" || currentBlock.block_type === "survey" ? (
          <div className="mt-4 space-y-8">
            {(Array.isArray(currentBlock.config?.questions) 
              ? currentBlock.config.questions 
              : [{ 
                  id: currentBlock.id, 
                  question: currentBlock.config?.question, 
                  surveyType: currentBlock.config?.surveyType, 
                  options: currentBlock.config?.options,
                  scaleSize: currentBlock.config?.scaleSize
                }]
            ).map((q: any, i: number) => {
              const isMcq = currentBlock.block_type === "multiple_choice" || q.surveyType === "mcq";
              const isText = q.surveyType === "open_text";
              const isLikert = currentBlock.block_type === "survey" && (!q.surveyType || q.surveyType === "likert");
              const currentAnswer = answers[q.id];

              return (
                <div key={q.id} className="space-y-3">
                  <p className="text-sm font-medium">{String(q.question ?? (isMcq ? "Please select an option:" : "Please rate:"))}</p>
                  
                  {isMcq && (
                    <div className="grid gap-3">
                      {(Array.isArray(q.options) ? q.options : (isLikert ? [] : ["Strongly disagree", "Neutral", "Strongly agree"])).map((opt: string) => (
                        <button
                          type="button"
                          key={opt}
                          data-selected={currentAnswer === opt}
                          onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                          className="option-btn rounded-2xl px-5 py-4 text-left text-base font-medium flex items-center justify-between group"
                        >
                          <span className="flex-1 break-words pr-4">{opt}</span>
                          <div className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${currentAnswer === opt ? "border-[var(--brand)] bg-[var(--brand)]" : "border-white/20"}`}>
                            {currentAnswer === opt && <Check className="w-3 h-3 text-black font-bold" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {isLikert && (
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
                        {Array.from({ length: Number(q.scaleSize || 5) }).map((_, idx) => {
                          const val = idx + 1;
                          return (
                            <button
                              type="button"
                              key={val}
                              data-selected={currentAnswer === val}
                              onClick={() => setAnswers(prev => ({ ...prev, [q.id]: val }))}
                              className="option-btn w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-lg font-bold"
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex justify-between px-2 text-[10px] uppercase tracking-widest text-white/30 font-bold">
                        <span>Low Intensity</span>
                        <span>High Intensity</span>
                      </div>
                    </div>
                  )}

                  {isText && (
                    <textarea
                      value={String(currentAnswer || "")}
                      onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder="Type your response here..."
                      className="w-full min-h-[120px] rounded-2xl border border-white/10 bg-white/5 p-5 text-base text-white placeholder:text-white/20 focus:border-[var(--brand)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--brand)]/30 transition-all"
                    />
                  )}
                </div>
              );
            })}
          </div>
        ) : null}

        {currentBlock.block_type === "ux_task" ? (
          <div className="mt-4">
            {(currentBlock.config?.taskType ?? "first_click") === "prototype_iframe" ? (
              <iframe className="h-56 w-full rounded-lg border border-white/20 bg-white" src={String(currentBlock.config?.iframeUrl ?? "https://example.com")} title="prototype task" />
            ) : (
              <div className="overflow-hidden rounded-lg border border-white/20 bg-[#0f172d]">
                {currentBlock.config?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt="task"
                    src={String(currentBlock.config.imageUrl)}
                    className="h-56 w-full object-cover"
                    onClick={handleFirstClick}
                  />
                ) : (
                  <div className="h-56 w-full" onClick={handleFirstClick} />
                )}
              </div>
            )}
            {/* Interaction captured indicator could go here if needed */}
          </div>
        ) : null}

        {currentBlock.block_type === "brs" ? (
          <div className="mt-4">
            <div className="mb-4 p-3 rounded-xl border border-violet-500/20 bg-violet-500/5">
              <div className="flex items-center gap-2 mb-1">
                <Info className="w-4 h-4 text-violet-400" />
                <p className="text-sm font-medium text-violet-300">Brief Resilience Scale</p>
              </div>
              <p className="text-xs text-white/50 leading-relaxed">
                {String(currentBlock.config?.instruction || "Please respond to each item by marking one box per row.")}
              </p>
            </div>

            {/* Scale header */}
            <div className="hidden sm:grid sm:grid-cols-[1fr_repeat(5,48px)] gap-1 mb-2 px-2">
              <div />
              {(Array.isArray(currentBlock.config?.scaleLabels)
                ? currentBlock.config.scaleLabels
                : ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]
              ).map((label: string, i: number) => (
                <p key={i} className="text-[9px] text-center text-white/40 leading-tight font-medium uppercase tracking-wider">
                  {label}
                </p>
              ))}
            </div>

            {/* Items */}
            <div className="space-y-2">
              {(Array.isArray(currentBlock.config?.items) ? currentBlock.config.items : []).map(
                (item: { id: string; text: string; reversed: boolean }, i: number) => {
                  const selected = brsRatings[item.id];
                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border p-3 transition-all duration-200 ${
                        selected
                          ? "border-violet-500/30 bg-violet-500/5"
                          : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="sm:grid sm:grid-cols-[1fr_repeat(5,48px)] sm:items-center gap-1">
                        <p className="text-sm leading-relaxed mb-3 sm:mb-0">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/10 text-[10px] font-bold text-white/50 mr-2">
                            {i + 1}
                          </span>
                          {item.text}
                        </p>

                        {/* Mobile: horizontal labels */}
                        <div className="flex sm:hidden items-center justify-between mb-2 px-1">
                          <span className="text-[9px] text-white/30 uppercase tracking-wider">Strongly Disagree</span>
                          <span className="text-[9px] text-white/30 uppercase tracking-wider">Strongly Agree</span>
                        </div>

                        {/* Rating buttons */}
                        <div className="flex sm:contents gap-1 justify-center">
                          {[1, 2, 3, 4, 5].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setBrsRatings((prev) => ({ ...prev, [item.id]: val }))}
                              className={`flex-1 sm:flex-none sm:w-12 h-10 rounded-lg border text-sm font-medium transition-all duration-150 ${
                                selected === val
                                  ? "border-violet-400 bg-violet-500/25 text-violet-200 ring-1 ring-violet-500/40 scale-105"
                                  : "border-white/15 text-white/50 hover:bg-white/5 hover:text-white/70 hover:border-white/25"
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            {/* Live Score Preview */}
            {(() => {
              const items: Array<{ id: string; reversed: boolean }> = Array.isArray(currentBlock.config?.items) ? currentBlock.config.items : [];
              const answered = items.filter((item) => brsRatings[item.id]);
              if (answered.length === 0) return null;
              const total = answered.reduce((acc, item) => {
                const raw = brsRatings[item.id] || 0;
                return acc + (item.reversed ? 6 - raw : raw);
              }, 0);
              const mean = total / answered.length;
              const level = mean >= 4.3 ? "High" : mean >= 3.0 ? "Normal" : mean >= 1.5 ? "Low" : "Very Low";
              const levelColor = mean >= 4.3 ? "text-emerald-400" : mean >= 3.0 ? "text-blue-400" : mean >= 1.5 ? "text-amber-400" : "text-rose-400";
              return (
                <div className="mt-4 p-3 rounded-xl border border-white/10 bg-black/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold tabular-nums">{mean.toFixed(2)}</p>
                      <p className="text-[9px] text-white/30 uppercase tracking-widest">BRS Score</p>
                    </div>
                    <div className={`text-xs font-semibold ${levelColor}`}>{level} Resilience</div>
                  </div>
                  <p className="text-xs text-white/30">{answered.length}/{items.length} answered</p>
                </div>
              );
            })()}
          </div>
        ) : null}

        {currentBlock.block_type === "reaction_time" ? (
          <div 
            className={`mt-4 relative min-h-[300px] flex flex-col items-center justify-center rounded-2xl border transition-all duration-300 ${
              rtPhase === "feedback" 
                ? rtFeedback === "correct" ? "border-emerald-500/50 bg-emerald-500/5" : "border-rose-500/50 bg-rose-500/5"
                : "border-white/10 bg-black/20"
            }`}
            onClick={() => handleRtInput("tap")}
          >
            {rtPhase === "fixation" && <span className="text-4xl font-light text-white/40">+</span>}
            
            {rtPhase === "stimulus" && (
              currentBlock.config?.stimulusType === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={rtStimulus!} alt="stimulus" className="max-h-48 object-contain animate-in fade-in zoom-in duration-75" />
              ) : (
                <span className="text-5xl font-bold tracking-tight animate-in fade-in zoom-in duration-75">{rtStimulus}</span>
              )
            )}

            {rtPhase === "feedback" && (
              <div className="text-center animate-in fade-in slide-in-from-bottom-2">
                <p className={`text-xl font-bold ${rtFeedback === "correct" ? "text-emerald-400" : "text-rose-400"}`}>
                  {rtFeedback === "correct" ? "Good!" : "Oops!"}
                </p>
                <p className="text-xs text-white/40 mt-1">Trial {rtTrialIdx + 1} complete</p>
              </div>
            )}

            {rtPhase === "complete" && (
              <div className="text-center">
                <p className="text-emerald-300 font-medium">Block Complete</p>
                <p className="text-xs text-white/40 mt-1">Tap Next to continue</p>
              </div>
            )}

            {rtPhase === "idle" && <p className="text-xs text-white/40">Ready...</p>}
            {rtPhase === "isi" && <div className="w-1 h-1 bg-white/10 rounded-full" />}

            <div className="absolute bottom-4 left-0 right-0 text-center">
               <p className="text-[10px] uppercase tracking-widest text-white/20">
                 {String(currentBlock.config?.instruction || "Tap when you see the target")}
               </p>
            </div>
          </div>
        ) : null}

        {currentBlock.block_type === "iat" ? (
          <div className="mt-4 rounded-lg border border-white/20 p-4">
            <div className="flex items-center justify-between text-xs text-[var(--muted)]">
              <span>
                Trial {Math.min(iatIndex + 1, iatTrials.trials.length)}/{iatTrials.trials.length}
              </span>
              <span>{iatDone ? "Complete" : "In progress"}</span>
            </div>
            <p className="mt-3 text-center text-2xl font-semibold">
              {String(iatTrials.trials[iatIndex]?.text ?? "Stimulus")}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => answerIat("left")}
                className="rounded-lg border border-white/20 px-3 py-2 text-sm active:scale-[0.99]"
              >
                {iatTrials.left}
              </button>
              <button
                type="button"
                onClick={() => answerIat("right")}
                className="rounded-lg border border-white/20 px-3 py-2 text-sm active:scale-[0.99]"
              >
                {iatTrials.right}
                </button>
            </div>
          </div>
        ) : null}
          </div>
        </div>

          <div className="sticky bottom-0 pb-8 pt-10 bg-gradient-to-t from-[#070c1a] via-[#070c1a] to-transparent z-40">
            <button 
              type="button" 
              onClick={handleNext} 
              disabled={status === "saving"} 
              className="btn-primary w-full rounded-2xl px-6 py-5 text-lg font-bold shadow-2xl flex items-center justify-center gap-3 active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-wait"
            >
              {status === "saving" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {idx === blocks.length - 1 ? "Complete Study" : "Continue"}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
            {message ? (
              <p className={`mt-4 text-center text-sm font-semibold px-4 py-2 rounded-xl animate-pulse ${status === "error" ? "text-rose-400 bg-rose-500/10 border border-rose-500/20" : "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"}`}>
                {message}
              </p>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
