"use client";

import { useEffect, useState } from "react";
import { Check, ArrowRight, Loader2, Info, ShieldAlert, AlertCircle } from "lucide-react";
import { applyLogicNextBlockId, isDisqualified } from "@/lib/runtime/logic";
import type { StudyBlock, ResponseItem } from "@/lib/types";

export function StudyRunner({
  studyId,
  studyDbId,
  blocks,
  logicRules,
  disqualificationRules,
  magicToken,
  sessionId: initialSessionId,
  participantToken: initialParticipantToken,
}: {
  studyId: string;
  studyDbId: string;
  blocks: StudyBlock[];
  logicRules?: any[];
  disqualificationRules?: any[];
  randomizationRules?: any[];
  magicToken?: string | null;
  sessionId?: string;
  participantToken?: string;
}) {
  // ── State ────────────────────────────────────────────────────────────────
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [allResponses, setAllResponses] = useState<ResponseItem[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const [participantToken, setParticipantToken] = useState<string | null>(initialParticipantToken || null);
  const [consent, setConsent] = useState(false);
  const [isScreenedOut, setIsScreenedOut] = useState(false);
  const [completionCode, setCompletionCode] = useState<string | null>(null);

  // blocks come pre-sorted by sort_order from the DB — DO NOT SHUFFLE
  const orderedBlocks: StudyBlock[] = blocks;

  const currentBlock = orderedBlocks[idx];
  const total = orderedBlocks.length;
  const progress = total > 0 ? Math.round(((idx + 1) / total) * 100) : 0;
  const storageKey = `survey_session_${studyId}`;

  // ── Session start / resume ────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) startSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startSession() {
    try {
      let sId: string | null = null;
      let pToken: string | null = null;
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          sId = parsed.sId ?? null;
          pToken = parsed.pToken ?? null;
        }
      } catch {}

      const res = await fetch("/api/participant/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studyPublicId: studyId,
          magicToken,
          resumeSessionId: sId,
          resumeToken: pToken,
        }),
      });
      const data = await res.json();
      if (data.sessionId) {
        setSessionId(data.sessionId);
        setParticipantToken(data.participantToken);
        try {
          localStorage.setItem(storageKey, JSON.stringify({ sId: data.sessionId, pToken: data.participantToken }));
        } catch {}
        if (typeof data.currentStep === "number" && data.currentStep > 0) {
          setIdx(data.currentStep);
        }
        if (data.answersSnapshot && typeof data.answersSnapshot === "object") {
          setAnswers(data.answersSnapshot);
          if (data.answersSnapshot.consent) setConsent(true);
        }
        if (Array.isArray(data.existingResponses)) {
          setAllResponses(data.existingResponses);
        }
      }
    } catch (err) {
      console.error("startSession error", err);
    }
  }

  // ── Collect response for current block ───────────────────────────────────
  function collectBlockResponses(): ResponseItem[] {
    if (!currentBlock || !sessionId) return [];
    const additions: ResponseItem[] = [];

    if (currentBlock.block_type === "survey" || currentBlock.block_type === "multiple_choice") {
      const qs: any[] = Array.isArray(currentBlock.config?.questions)
        ? currentBlock.config.questions
        : [{ id: currentBlock.id, ...currentBlock.config }];

      qs.forEach((q: any) => {
        const val = answers[q.id];
        if (val === undefined || val === null || String(val).trim() === "") return;
        const key = q.questionKey || `${currentBlock.block_type}_${q.id}`;
        additions.push({
          study_id: studyDbId,
          participant_session_id: sessionId,
          question_key: key,
          response_type: typeof val === "number" ? "numeric" : "text",
          text_value: typeof val === "string" ? val : null,
          numeric_value: typeof val === "number" ? val : null,
          json_value: typeof val === "object" && val !== null ? val : null,
        });
      });
    }

    if (currentBlock.block_type === "brs") {
      const items: any[] = Array.isArray(currentBlock.config?.items) ? currentBlock.config.items : [];
      items.forEach((item: any) => {
        const val = answers[item.id];
        if (val === undefined) return;
        additions.push({
          study_id: studyDbId,
          participant_session_id: sessionId,
          question_key: `brs_${currentBlock.id}_${item.id}`,
          response_type: "numeric",
          numeric_value: val,
          text_value: null,
        });
      });
    }

    return additions;
  }

  // ── Sync to server (fire-and-forget) ─────────────────────────────────────
  function syncToServer(latestResponses: ResponseItem[], nextIdx: number, latestAnswers: Record<string, any>) {
    if (!sessionId || !participantToken) return;
    const snapshot = { ...latestAnswers, consent };
    fetch("/api/participant/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studyId: studyDbId,
        sessionId,
        participantToken,
        responses: latestResponses,
        currentStep: nextIdx,
        answersSnapshot: snapshot,
      }),
    }).catch(() => {});
  }

  // ── Submit completion ─────────────────────────────────────────────────────
  async function submitCompletion(finalResponses: ResponseItem[], isDisq = false) {
    if (!sessionId || !participantToken) return false;
    setStatus("saving");
    try {
      const res = await fetch("/api/participant/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          participantToken,
          responses: finalResponses,
          isDisqualified: isDisq,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("saved");
        if (data.completionCode) setCompletionCode(data.completionCode);
        try { localStorage.removeItem(storageKey); } catch {}
        return true;
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to save responses. Please try again.");
        return false;
      }
    } catch {
      setStatus("error");
      setMessage("Connection lost. Please try again.");
      return false;
    }
  }

  // ── Validation ────────────────────────────────────────────────────────────
  function validate(): string | null {
    if (!currentBlock) return null;

    if (currentBlock.block_type === "consent") {
      return consent ? null : "Please agree to the consent form to continue.";
    }

    const required = currentBlock.config?.required !== false;
    if (!required) return null;

    if (currentBlock.block_type === "survey" || currentBlock.block_type === "multiple_choice") {
      const qs: any[] = Array.isArray(currentBlock.config?.questions)
        ? currentBlock.config.questions
        : [{ id: currentBlock.id }];
      const incomplete = qs.some((q: any) => {
        const v = answers[q.id];
        return v === undefined || v === null || String(v).trim() === "";
      });
      if (incomplete) return "Please answer all questions before continuing.";
    }

    if (currentBlock.block_type === "brs") {
      const items: any[] = Array.isArray(currentBlock.config?.items) ? currentBlock.config.items : [];
      if (items.some((item: any) => answers[item.id] === undefined)) {
        return "Please respond to all items before continuing.";
      }
    }

    return null;
  }

  // ── Continue handler ──────────────────────────────────────────────────────
  async function handleNext() {
    if (status === "saving") return;

    const validationError = validate();
    if (validationError) {
      setMessage(validationError);
      return;
    }
    setMessage("");

    // Collect this block's responses
    const newResponses = collectBlockResponses();
    const mergedResponseMap: Record<string, any> = { ...answers, consent };

    // Merge new responses into answer map for logic checks
    newResponses.forEach((r) => {
      const key = r.question_key;
      mergedResponseMap[key] = r.numeric_value !== null ? r.numeric_value : r.text_value;
    });

    const latestAllResponses = [
      ...allResponses.filter((r) => !newResponses.some((n) => n.question_key === r.question_key)),
      ...newResponses,
    ];

    // Disqualification check
    const dqResult = isDisqualified(disqualificationRules ?? [], mergedResponseMap);
    if (dqResult.disqualified) {
      await submitCompletion(latestAllResponses, true);
      setIsScreenedOut(true);
      setMessage(dqResult.message || "You do not meet the eligibility criteria for this study.");
      return;
    }

    // Logic rules check
    const logicDecision = applyLogicNextBlockId({
      currentBlockId: currentBlock.id,
      rules: logicRules ?? [],
      responses: mergedResponseMap,
    });

    if (logicDecision.terminate) {
      setAllResponses(latestAllResponses);
      await submitCompletion(latestAllResponses);
      return;
    }

    let nextIdx = idx + 1;
    if (logicDecision.nextBlockId) {
      const targetIdx = orderedBlocks.findIndex((b) => b.id === logicDecision.nextBlockId);
      if (targetIdx !== -1) {
        nextIdx = targetIdx;
      }
    }

    // Last block?
    if (idx >= orderedBlocks.length - 1 && !logicDecision.nextBlockId) {
      setAllResponses(latestAllResponses);
      await submitCompletion(latestAllResponses);
      return;
    }
    setAllResponses(latestAllResponses);
    syncToServer(latestAllResponses, nextIdx, answers);
    setIdx(nextIdx);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (!currentBlock) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-white/30" />
      </div>
    );
  }

  // ── Screened out ──────────────────────────────────────────────────────────
  if (isScreenedOut) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-8 max-w-lg mx-auto">
        <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
          <ShieldAlert className="w-10 h-10 text-rose-400" />
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-bold">Study Concluded</h2>
          <p className="text-white/60 leading-relaxed">
            {message || "Based on your responses, you do not meet the criteria for this specific study. Thank you for your time."}
          </p>
        </div>
      </div>
    );
  }

  // ── Completed ─────────────────────────────────────────────────────────────
  if (status === "saved") {
    const thankYouBlock = orderedBlocks.find((b) => b.block_type === "thank_you");
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-8 max-w-lg mx-auto">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Check className="w-10 h-10 text-emerald-400" />
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-bold">
            {String(thankYouBlock?.config?.title || "Thank You!")}
          </h2>
          <p className="text-white/60 leading-relaxed">
            {String(thankYouBlock?.config?.message || "Your responses have been recorded. Thank you for participating!")}
          </p>
        </div>
        {completionCode && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3 w-full max-w-xs">
            <p className="text-[11px] uppercase tracking-widest text-white/40 font-bold">Completion Code</p>
            <div className="text-4xl font-mono font-black tracking-widest text-[var(--brand)]">
              {completionCode}
            </div>
            <p className="text-[11px] text-white/30">
              Screenshot or copy this code to confirm your participation.
            </p>
          </div>
        )}
      </div>
    );
  }


  // ── Main study render ─────────────────────────────────────────────────────
  const isLastStep = idx >= orderedBlocks.length - 1;


  return (
    <section className="flex flex-col max-w-2xl mx-auto w-full px-4 sm:px-0 pb-40">
      {/* Progress bar */}
      <div className="sticky top-0 z-40 pt-4 pb-3 bg-[var(--background)]/90 backdrop-blur-md">
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">
          <span>Step {idx + 1} of {orderedBlocks.length}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--brand)] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Block card */}
      <div className="mt-6 survey-card p-6 sm:p-10 rounded-3xl">
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-0.5 w-6 bg-[var(--brand)] rounded-full opacity-60" />
            <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-[var(--brand)]">
              {currentBlock.block_type.replace(/_/g, " ")}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold leading-snug">{currentBlock.label}</h1>
        </header>

        <main>
          {/* ── CONSENT ── */}
          {currentBlock.block_type === "consent" && (
            <div className="space-y-6">
              {!!(currentBlock.config?.title) && (
                <h2 className="text-lg font-semibold text-[var(--brand)]">
                  {String(currentBlock.config.title)}
                </h2>
              )}
              <div className="bg-white/5 rounded-2xl p-5 border border-white/10 max-h-[45vh] overflow-y-auto">
                <p className="text-white/80 whitespace-pre-wrap leading-relaxed text-sm">
                  {String(currentBlock.config?.text || "By proceeding, you agree to participate in this research study.")}
                </p>
              </div>
              {/* Consent toggle — large tap target */}
              <button
                type="button"
                onClick={() => { setConsent((v) => !v); setMessage(""); }}
                className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left ${
                  consent
                    ? "border-[var(--brand)] bg-[var(--brand)]/10"
                    : "border-white/15 bg-white/5 hover:border-white/30"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    consent ? "bg-[var(--brand)] border-[var(--brand)]" : "border-white/25 bg-white/5"
                  }`}
                >
                  {consent && <Check className="w-4 h-4 text-black font-black" />}
                </div>
                <span className="font-semibold text-base">I have read the information and agree to participate</span>
              </button>
            </div>
          )}

          {/* ── SURVEY / MCQ ── */}
          {(currentBlock.block_type === "survey" || currentBlock.block_type === "multiple_choice") && (
            <div className="space-y-10">
              {!!currentBlock.config?.instruction && (
                <div className="flex gap-3 bg-[var(--brand)]/5 border border-[var(--brand)]/15 p-4 rounded-xl">
                  <Info className="w-5 h-5 text-[var(--brand)] shrink-0 mt-0.5" />
                  <p className="text-sm text-[var(--brand)]/90 leading-relaxed italic">
                    {String(currentBlock.config.instruction)}
                  </p>
                </div>
              )}

              {(Array.isArray(currentBlock.config?.questions)
                ? currentBlock.config.questions
                : [{ id: currentBlock.id, ...currentBlock.config }]
              ).map((q: any, qi: number) => {
                const ans = answers[q.id];
                return (
                  <div key={q.id} className="space-y-5">
                    <div className="flex gap-3">
                      <span className="text-[var(--brand)]/40 font-black font-mono text-sm mt-1 select-none">
                        {String(qi + 1).padStart(2, "0")}
                      </span>
                      <p className="text-base sm:text-lg font-semibold leading-snug">
                        {String(q.question || q.prompt || "Please answer:")}
                      </p>
                    </div>

                    {/* MCQ options */}
                    {(q.surveyType === "mcq" || currentBlock.block_type === "multiple_choice") &&
                      Array.isArray(q.options) && (
                        <div className="grid gap-2.5 pl-7">
                          {(q.options as string[]).map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => { setAnswers((p) => ({ ...p, [q.id]: opt })); setMessage(""); }}
                              className={`option-btn w-full p-4 rounded-2xl text-left font-medium flex items-center justify-between gap-3 ${
                                ans === opt ? "data-[selected=true]" : ""
                              }`}
                              data-selected={ans === opt}
                            >
                              <span className="flex-1">{opt}</span>
                              <div
                                className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                                  ans === opt ? "bg-[var(--brand)] border-[var(--brand)]" : "border-white/20"
                                }`}
                              >
                                {ans === opt && <Check className="w-3 h-3 text-black" />}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                    {/* Likert scale */}
                    {q.surveyType === "likert" && (
                      <div className="pl-7 space-y-3">
                        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Number(q.scaleSize) || 5}, 1fr)` }}>
                          {Array.from({ length: Number(q.scaleSize) || 5 }).map((_, i) => {
                            const val = i + 1;
                            return (
                              <button
                                key={val}
                                type="button"
                                onClick={() => { setAnswers((p) => ({ ...p, [q.id]: val })); setMessage(""); }}
                                data-selected={ans === val}
                                className="likert-point option-btn h-12 rounded-xl font-bold text-base"
                              >
                                {val}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex justify-between text-[10px] font-bold text-white/30 uppercase tracking-widest">
                          <span>{(q.scaleLabels as string[])?.[0] ?? "Not at all"}</span>
                          <span>{(q.scaleLabels as string[])?.[((q.scaleLabels as string[])?.length ?? 1) - 1] ?? "Extremely"}</span>
                        </div>
                      </div>
                    )}

                    {/* Open text */}
                    {q.surveyType === "open_text" && (
                      <textarea
                        value={String(ans ?? "")}
                        onChange={(e) => { setAnswers((p) => ({ ...p, [q.id]: e.target.value })); setMessage(""); }}
                        placeholder="Your answer here..."
                        rows={4}
                        className="w-full rounded-2xl p-4 text-base bg-white/5 border border-white/10 focus:border-[var(--brand)]/50 focus:outline-none resize-none ml-7"
                        style={{ width: "calc(100% - 1.75rem)" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── BRS scale ── */}
          {currentBlock.block_type === "brs" && (
            <div className="space-y-6">
              {!!currentBlock.config?.instruction && (
                <div className="flex gap-3 bg-[var(--brand)]/5 border border-[var(--brand)]/15 p-4 rounded-xl">
                  <Info className="w-5 h-5 text-[var(--brand)] shrink-0 mt-0.5" />
                  <p className="text-sm text-[var(--brand)]/90 leading-relaxed italic">
                    {String(currentBlock.config.instruction)}
                  </p>
                </div>
              )}
              {(currentBlock.config?.items as any[] ?? []).map((item: any, ii: number) => (
                <div key={item.id} className="space-y-3 p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                  <p className="font-medium text-base">{ii + 1}. {item.text}</p>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => { setAnswers((p) => ({ ...p, [item.id]: val })); setMessage(""); }}
                        data-selected={answers[item.id] === val}
                        className="likert-point option-btn h-12 rounded-xl font-bold text-base"
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── THANK YOU block ── */}
          {currentBlock.block_type === "thank_you" && (
            <div className="flex flex-col items-center text-center space-y-6 py-6">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Check className="w-10 h-10 text-emerald-400" />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-bold">
                  {String(currentBlock.config?.title || "Thank You!")}
                </h2>
                <p className="text-white/60 leading-relaxed">
                  {String(currentBlock.config?.message || "Your participation is greatly appreciated.")}
                </p>
              </div>
              {completionCode && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3 w-full max-w-xs">
                  <p className="text-[11px] uppercase tracking-widest text-white/40 font-bold">Completion Code</p>
                  <div className="text-4xl font-mono font-black tracking-widest text-[var(--brand)]">
                    {completionCode}
                  </div>
                  <p className="text-[11px] text-white/30">Screenshot or copy this code to confirm your participation.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Info / instruction / other block types ── */}
          {!([
            "consent", "survey", "multiple_choice", "brs", "thank_you", "iat", "reaction_time", "attention_check"
          ] as string[]).includes(currentBlock.block_type) && (
            <div className="prose prose-invert max-w-none">
              <p className="text-white/80 leading-relaxed whitespace-pre-wrap">
                {String((currentBlock.config?.text as string) || (currentBlock.config?.content as string) || "")}
              </p>
            </div>
          )}
        </main>
      </div>

      {/* ── Sticky footer navigation ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-5 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/95 to-transparent">
        <div className="max-w-2xl mx-auto flex flex-col gap-3">
          {message && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{message}</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={status === "saving"}
            className="btn-primary w-full h-14 rounded-2xl flex items-center justify-center gap-3 text-base font-semibold disabled:opacity-60 active:scale-[0.98] transition-transform"
          >
            {status === "saving" ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {currentBlock.block_type === "thank_you" ? "Complete Study" : isLastStep ? "Submit" : "Continue"}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
