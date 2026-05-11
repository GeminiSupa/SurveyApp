"use client";

import { useEffect, useState, useMemo } from "react";
import { Check, ArrowRight, Loader2, Info, ShieldAlert, AlertCircle, HelpCircle } from "lucide-react";
import { applyLogicNextBlockId, isDisqualified, shuffleBlocksDeterministic } from "@/lib/runtime/logic";
import type { StudyBlock, ResponseItem } from "@/lib/types";

export function StudyRunner({ 
  studyId, 
  studyDbId,
  blocks, 
  logicRules, 
  disqualificationRules, 
  randomizationRules,
  magicToken,
  sessionId: initialSessionId,
  participantToken: initialParticipantToken
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
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const [participantToken, setParticipantToken] = useState<string | null>(initialParticipantToken || null);
  const [consent, setConsent] = useState(false);
  const [isScreenedOut, setIsScreenedOut] = useState(false);
  const [completionCode, setCompletionCode] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [attentionCheckPassed, setAttentionCheckPassed] = useState(true);

  // Persistence Key
  const storageKey = `survey_session_${studyId}`;

  // Initialize randomized blocks
  const randomizedBlocks = useMemo(() => {
    if (!blocks.length) return [];
    
    // 1. Separate special blocks from randomized pool
    const consentBlocks = blocks.filter(b => b.block_type === 'consent');
    const thankYouBlocks = blocks.filter(b => b.block_type === 'thank_you');
    const pool = blocks.filter(b => b.block_type !== 'consent' && b.block_type !== 'thank_you');
    
    // 2. Shuffle pool
    const shuffled = shuffleBlocksDeterministic(pool, participantToken || "default");
    
    // 3. Reassemble
    const result = [...consentBlocks, ...shuffled, ...thankYouBlocks];
    
    // 4. Handle Attention Check (Inject if needed)
    // For now we assume they are already in the list if configured
    
    return result;
  }, [blocks, participantToken]);

  const currentBlock = randomizedBlocks[idx];
  const progress = Math.round(((idx + 1) / randomizedBlocks.length) * 100);

  useEffect(() => {
    if (!sessionId) {
      startSession();
    }
  }, [sessionId]);

  async function startSession() {
    try {
      // Check for saved session in local storage
      const saved = localStorage.getItem(storageKey);
      const { sId, pToken } = saved ? JSON.parse(saved) : { sId: null, pToken: null };

      const res = await fetch("/api/participant/start", {
        method: "POST",
        body: JSON.stringify({ 
          studyPublicId: studyId,
          magicToken,
          resumeSessionId: sId,
          resumeToken: pToken
        }),
      });
      const data = await res.json();
      if (data.sessionId) {
        setSessionId(data.sessionId);
        setParticipantToken(data.participantToken);
        localStorage.setItem(storageKey, JSON.stringify({ sId: data.sessionId, pToken: data.participantToken }));

        // Resume state if returned
        if (data.currentStep !== undefined) setIdx(data.currentStep);
        if (data.answersSnapshot) setAnswers(data.answersSnapshot);
        if (data.existingResponses) setResponses(data.existingResponses);
        if (data.answersSnapshot?.consent) setConsent(true);
      }
    } catch (err) {
      console.error(err);
      setOffline(true);
    }
  }

  function collectCurrentResponse() {
    if (!currentBlock) return null;
    const additions: ResponseItem[] = [];
    const mapAdditions: Record<string, any> = {};

    if (currentBlock.block_type === "survey" || currentBlock.block_type === "multiple_choice") {
      const qs = Array.isArray(currentBlock.config?.questions) ? currentBlock.config.questions : [{ id: currentBlock.id }];
      qs.forEach((q: any) => {
        const val = answers[q.id];
        if (val !== undefined) {
          const key = q.questionKey || `${currentBlock.block_type}_${q.id}`;
          additions.push({
            study_id: studyDbId,
            participant_session_id: sessionId!,
            question_key: key,
            response_type: typeof val === "number" ? "numeric" : "text",
            text_value: typeof val === "string" ? val : null,
            numeric_value: typeof val === "number" ? val : null,
            json_value: typeof val === "object" ? val : null,
          });
          mapAdditions[key] = val;
        }
      });
    }

    if (currentBlock.block_type === "brs" && currentBlock.config?.items) {
      const items = Array.isArray(currentBlock.config.items) ? currentBlock.config.items : [];
      items.forEach((item: any) => {
        const val = answers[item.id];
        if (val !== undefined) {
          const key = `brs_${currentBlock.id}_${item.id}`;
          additions.push({
            study_id: studyId,
            participant_session_id: sessionId!,
            question_key: key,
            response_type: "numeric",
            numeric_value: val,
          });
          mapAdditions[key] = val;
        }
      });
    }

    return { responseAdditions: additions, responseMapAdditions: mapAdditions };
  }

  async function syncResponses(currentResponses: ResponseItem[], step?: number) {
    if (!sessionId || !participantToken) return;
    
    void fetch("/api/participant/sync", {
      method: "POST",
      body: JSON.stringify({
        studyId: studyDbId,
        sessionId,
        participantToken,
        responses: currentResponses || [],
        currentStep: step ?? idx,
        answersSnapshot: { ...answers, consent }
      }),
    });
  }

  async function submitCompletion(allResponses: ResponseItem[], completionMessage: string, isDisqualifiedSession: boolean = false) {
    if (!sessionId || !participantToken) return false;
    
    setStatus("saving");
    try {
      const res = await fetch("/api/participant/complete", {
        method: "POST",
        body: JSON.stringify({
          sessionId,
          participantToken,
          responses: allResponses,
          isDisqualified: isDisqualifiedSession,
        }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setStatus("saved");
        setMessage(completionMessage);
        if (data.completionCode) setCompletionCode(data.completionCode);
        return true;
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to save responses.");
        return false;
      }
    } catch (err) {
      setStatus("error");
      setMessage("Connection lost. Please try again.");
      return false;
    }
  }

  async function handleNext() {
    if (status === "saving") return;

    // Validation
    if (currentBlock.block_type === "consent" && !consent) {
      setMessage("Please provide your consent to continue.");
      return;
    }

    const isRequired = currentBlock.config?.required !== false;
    if (isRequired) {
      if (currentBlock.block_type === "survey" || currentBlock.block_type === "multiple_choice") {
        const qs = Array.isArray(currentBlock.config?.questions) ? currentBlock.config.questions : [{ id: currentBlock.id }];
        const incomplete = qs.some((q: any) => answers[q.id] === undefined || answers[q.id] === null || String(answers[q.id]).trim() === "");
        if (incomplete) {
          setMessage("Please answer all questions before continuing.");
          return;
        }
      }
      if (currentBlock.block_type === "brs") {
        const items = Array.isArray(currentBlock.config?.items) ? currentBlock.config.items : [];
        const incomplete = items.some((item: any) => answers[item.id] === undefined);
        if (incomplete) {
          setMessage("Please respond to all items in the scale.");
          return;
        }
      }
    }

    setMessage("");
    const collected = collectCurrentResponse();
    const nextResponseMap = { ...answers, ...(collected?.responseMapAdditions ?? {}) };
    const nextResponses = [...responses, ...(collected?.responseAdditions ?? [])];

    // Check Disqualification
    const dq = isDisqualified(disqualificationRules ?? [], nextResponseMap);
    if (dq.disqualified) {
      await submitCompletion(nextResponses, dq.message || "Eligibility criteria not met.", true);
      setIsScreenedOut(true);
      return;
    }

    // Logic for next block
    const decision = applyLogicNextBlockId({
      currentBlockId: currentBlock.id,
      rules: logicRules ?? [],
      responses: nextResponseMap
    });

    if (decision.terminate) {
      await submitCompletion(nextResponses, "Study concluded.");
      return;
    }

    if (idx < randomizedBlocks.length - 1) {
      const nextIdx = idx + 1;
      await syncResponses(collected?.responseAdditions ?? [], nextIdx);
      setResponses(nextResponses);
      setIdx(nextIdx);
      window.scrollTo(0, 0);
      return;
    }

    // Last block
    const completed = await submitCompletion(nextResponses, "Study Complete.");
    if (completed) {
      localStorage.removeItem(storageKey);
    }
  }

  if (!currentBlock) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-white/40">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <section className="flex flex-1 flex-col justify-between animate-step max-w-2xl mx-auto w-full">
      {isScreenedOut ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-8 survey-card rounded-3xl mt-12 animate-in fade-in slide-in-from-bottom-4">
          <div className="w-24 h-24 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shadow-lg">
            <ShieldAlert className="w-12 h-12 text-rose-500" />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-bold tracking-tight">Study Concluded</h2>
            <p className="text-white/60 leading-relaxed text-lg">
              {message || "Based on your responses, you do not meet the criteria for this specific study."}
            </p>
          </div>
        </div>
      ) : status === "saved" ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-10 survey-card rounded-3xl mt-12 animate-in fade-in slide-in-from-bottom-4">
          <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-lg">
            <Check className="w-12 h-12 text-emerald-500" />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-bold tracking-tight">{String(currentBlock?.config?.title || "Thank You!")}</h2>
            <p className="text-white/60 leading-relaxed text-lg whitespace-pre-wrap">
              {String(currentBlock?.config?.message || message || "Your participation is complete and your responses have been recorded.")}
            </p>
          </div>
          
          {completionCode && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-4 w-full max-w-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40 font-bold">Your Completion Code</p>
              <div className="text-5xl font-mono font-black tracking-widest text-brand">
                {completionCode}
              </div>
              <p className="text-[11px] text-white/30 leading-relaxed">
                Take a screenshot or copy this code to verify your participation.
              </p>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="pb-32 px-4 sm:px-0">
            {/* Progress Bar */}
            <div className="sticky top-0 z-50 pt-4 pb-2 bg-background/80 backdrop-blur-md">
              <div className="flex items-center justify-between mb-2 text-[10px] font-bold uppercase tracking-widest text-white/30">
                <span>Part {idx + 1} of {randomizedBlocks.length}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-brand-strong rounded-full transition-all duration-700 ease-out" 
                  style={{ width: `${progress}%` }} 
                />
              </div>
            </div>

            {/* Content Area */}
            <div className="mt-8 survey-card p-6 sm:p-10 rounded-[2.5rem] relative">
              <header className="mb-10">
                <div className="flex items-center gap-2 mb-3">
                   <div className="h-1 w-8 bg-brand rounded-full opacity-50" />
                   <span className="text-[10px] uppercase tracking-[0.3em] font-black text-brand-strong">{currentBlock.block_type}</span>
                </div>
                <h1 className="leading-[1.2]">{currentBlock.label}</h1>
              </header>

              <main className="space-y-12">
                {currentBlock.block_type === "consent" && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                    <h2 className="text-brand font-bold">{String(currentBlock.config?.title || "Research Consent")}</h2>
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/5 max-h-[40vh] overflow-y-auto custom-scrollbar">
                      <p className="text-white/80 whitespace-pre-wrap leading-relaxed">
                        {String(currentBlock.config?.text || "By proceeding, you agree to participate in this research study.")}
                      </p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setConsent(!consent)}
                      className={`w-full flex items-center gap-4 p-5 rounded-2xl border transition-all ${consent ? "border-brand bg-brand/10" : "border-white/10 bg-white/5"}`}
                    >
                      <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${consent ? "bg-brand border-brand" : "border-white/20"}`}>
                        {consent && <Check className="w-4 h-4 text-black font-bold" />}
                      </div>
                      <span className="font-semibold text-left">I agree and wish to proceed</span>
                    </button>
                  </div>
                )}

                {(currentBlock.block_type === "survey" || currentBlock.block_type === "multiple_choice") && (
                  <div className="space-y-12">
                    {!!currentBlock.config?.instruction && (
                      <div className="flex gap-3 bg-brand/5 border border-brand/10 p-4 rounded-2xl">
                        <Info className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                        <p className="text-sm text-brand/90 leading-relaxed italic">{String(currentBlock.config.instruction)}</p>
                      </div>
                    )}
                    
                    {(Array.isArray(currentBlock.config?.questions) ? currentBlock.config.questions : [{ id: currentBlock.id, ...currentBlock.config }]).map((q: any, qi: number) => {
                      const ans = answers[q.id];
                      return (
                        <div key={q.id} className="space-y-6">
                          <div className="flex gap-4">
                            <span className="text-brand/30 font-black font-mono mt-1">{(qi + 1).toString().padStart(2, '0')}</span>
                            <p className="text-lg font-semibold leading-tight">{String(q.question || "Please answer:")}</p>
                          </div>

                          {(q.surveyType === "mcq" || currentBlock.block_type === "multiple_choice") && (
                            <div className="grid gap-3">
                              {(q.options || []).map((opt: string) => (
                                <button
                                  type="button"
                                  key={opt}
                                  data-selected={ans === opt}
                                  onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                  className="option-btn p-5 rounded-2xl text-left font-medium flex items-center justify-between group"
                                >
                                  <span className="flex-1 pr-4">{opt}</span>
                                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${ans === opt ? "bg-brand border-brand" : "border-white/10"}`}>
                                    {ans === opt && <Check className="w-4 h-4 text-black font-bold" />}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          {q.surveyType === "likert" && (
                            <div className="space-y-6">
                              <div className="grid grid-cols-5 sm:grid-cols-7 gap-2">
                                {Array.from({ length: Number(q.scaleSize || 5) }).map((_, i) => {
                                  const val = i + 1;
                                  return (
                                    <button
                                      type="button"
                                      key={val}
                                      data-selected={ans === val}
                                      onClick={() => setAnswers(prev => ({ ...prev, [q.id]: val }))}
                                      className="likert-point option-btn"
                                    >
                                      {val}
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="flex justify-between px-1 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">
                                <span>{(currentBlock.config?.scaleLabels as string[])?.[0] ?? "Not at all"}</span>
                                <span>{(currentBlock.config?.scaleLabels as string[])?.[(currentBlock.config?.scaleLabels as string[])?.length - 1] ?? "Extremely"}</span>
                              </div>
                            </div>
                          )}

                          {q.surveyType === "open_text" && (
                            <textarea
                              value={String(ans || "")}
                              onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                              placeholder="Your answer here..."
                              className="w-full min-h-[120px] rounded-2xl p-5 text-base"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {currentBlock.block_type === "brs" && (
                  <div className="space-y-8">
                    {(currentBlock.config?.items as any[])?.map((item: any, ii: number) => (
                      <div key={item.id} className="space-y-4 p-6 rounded-3xl bg-white/[0.02] border border-white/5">
                        <p className="text-base font-medium">{ii + 1}. {item.text}</p>
                        <div className="grid grid-cols-5 gap-2">
                          {[1, 2, 3, 4, 5].map(val => (
                            <button
                              type="button"
                              key={val}
                              data-selected={answers[item.id] === val}
                              onClick={() => setAnswers(prev => ({ ...prev, [item.id]: val }))}
                              className="likert-point option-btn text-base"
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </main>
            </div>
          </div>

          {/* Sticky Navigation */}
          <div className="fixed bottom-0 left-0 right-0 p-6 z-[60] bg-gradient-to-t from-background via-background/90 to-transparent backdrop-blur-[2px]">
            <div className="max-w-2xl mx-auto flex flex-col gap-4">
              {message && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-semibold animate-in slide-in-from-bottom-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{message}</span>
                </div>
              )}
              <button
                type="button"
                onClick={handleNext}
                disabled={status === "saving"}
                className="btn-primary w-full h-16 rounded-3xl flex items-center justify-center gap-3 text-lg active:scale-95 transition-transform"
              >
                {status === "saving" ? (
                   <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    {idx === randomizedBlocks.length - 1 ? "Finish Session" : "Continue"}
                    <ArrowRight className="w-6 h-6" />
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
