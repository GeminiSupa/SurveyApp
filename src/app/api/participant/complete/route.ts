import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/security/audit";
import { enforceRateLimit, enforceReplayProtection, getClientIp, requireTrustedOrigin } from "@/lib/security/request-guards";
import { withTiming } from "@/lib/telemetry";

type ResponsePayload = {
  questionKey: string;
  responseType: "text" | "likert" | "mcq" | "task" | "time_ms";
  textValue?: string;
  numericValue?: number;
  jsonValue?: Record<string, unknown>;
};

export async function POST(request: Request) {
  return withTiming("participant.complete", async () => {
    const ip = getClientIp(request);
    const originGuard = requireTrustedOrigin(request);
    if (!originGuard.ok) return originGuard.response;
    const rateGuard = enforceRateLimit(request, "participant-complete", 20, 60_000);
    if (!rateGuard.ok) return rateGuard.response;
    const replayGuard = await enforceReplayProtection(request, "/api/participant/complete");
    if (!replayGuard.ok) return replayGuard.response;

    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      await writeAuditLog({ route: "/api/participant/complete", action: "bootstrap", outcome: "error", ip });
      return NextResponse.json({ error: "Supabase admin client not configured." }, { status: 500 });
    }

    const body = (await request.json().catch(() => null)) as {
    studyId?: string;
    sessionId?: string;
    participantToken?: string;
    consentAccepted?: boolean;
    attentionCheckPassed?: boolean;
    responses?: ResponsePayload[];
    trials?: Array<{
      trialType: "iat" | "reaction_time";
      stimulus: string;
      expectedResponse?: string;
      actualResponse?: string;
      reactionTimeMs?: number;
      isCorrect?: boolean;
      payload?: Record<string, unknown>;
    }>;
    durationMs?: number;
  } | null;

    if (!body?.studyId || !body.sessionId || !body.participantToken || !Array.isArray(body.responses)) {
      return NextResponse.json({ error: "Invalid completion payload." }, { status: 400 });
    }
    if (body.consentAccepted !== undefined && typeof body.consentAccepted !== "boolean") {
      return NextResponse.json({ error: "Invalid completion payload." }, { status: 400 });
    }

    const { data: session, error: sessionError } = await supabase
      .from("participant_sessions")
      .select("id,study_id,status")
      .eq("id", body.sessionId)
      .eq("participant_token", body.participantToken)
      .single();
    if (sessionError || !session) {
      await writeAuditLog({ route: "/api/participant/complete", action: "session_validate", outcome: "blocked", ip });
      return NextResponse.json({ error: "Invalid participant session token." }, { status: 403 });
    }
    if (session.study_id !== body.studyId) {
      return NextResponse.json({ error: "Session does not belong to this study." }, { status: 409 });
    }

    const { error: consentError } = await supabase.from("consents").insert({
      study_id: body.studyId,
      participant_session_id: body.sessionId,
      consent_text_version: "v1",
      accepted: body.consentAccepted ?? false,
    });
    if (consentError) {
      return NextResponse.json({ error: `Failed to store consent: ${consentError.message}` }, { status: 500 });
    }

    if (body.responses.length) {
      const { error: responseInsertError } = await supabase.from("responses").insert(
        body.responses.map((item) => ({
          study_id: body.studyId,
          participant_session_id: body.sessionId,
          question_key: item.questionKey,
          response_type: item.responseType,
          text_value: item.textValue,
          numeric_value: item.numericValue,
          json_value: item.jsonValue,
        })),
      );
      if (responseInsertError) {
        return NextResponse.json({ error: `Failed to store responses: ${responseInsertError.message}` }, { status: 500 });
      }
    }

    if (Array.isArray(body.trials) && body.trials.length) {
      const { error: trialInsertError } = await supabase.from("psych_trials").insert(
        body.trials.map((trial) => ({
          study_id: body.studyId,
          participant_session_id: body.sessionId,
          trial_type: trial.trialType,
          stimulus: trial.stimulus,
          expected_response: trial.expectedResponse,
          actual_response: trial.actualResponse,
          reaction_time_ms: trial.reactionTimeMs,
          is_correct: trial.isCorrect,
          payload: trial.payload ?? {},
        })),
      );
      if (trialInsertError) {
        return NextResponse.json({ error: `Failed to store trial data: ${trialInsertError.message}` }, { status: 500 });
      }
    }

    const { error: eventInsertError } = await supabase.from("events").insert({
      study_id: body.studyId,
      participant_session_id: body.sessionId,
      event_type: "session_duration",
      payload: { durationMs: body.durationMs ?? 0 },
    });
    if (eventInsertError) {
      return NextResponse.json({ error: `Failed to store session duration: ${eventInsertError.message}` }, { status: 500 });
    }

    const completionCode = Math.floor(100000 + Math.random() * 900000).toString();

    const { error: completeUpdateError } = await supabase
      .from("participant_sessions")
      .update({ 
        status: "completed", 
        completed_at: new Date().toISOString(),
        completion_code: completionCode,
        attention_check_passed: body.attentionCheckPassed ?? false
      })
      .eq("id", body.sessionId);
    if (completeUpdateError) {
      return NextResponse.json({ error: `Failed to finalize completion: ${completeUpdateError.message}` }, { status: 500 });
    }

    await writeAuditLog({ route: "/api/participant/complete", action: "session_complete", outcome: "success", ip });
    return NextResponse.json({ ok: true, completionCode });
  });
}
