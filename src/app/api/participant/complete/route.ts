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
    if (session.status !== "in_progress" || session.study_id !== body.studyId) {
      return NextResponse.json({ error: "Session state does not allow completion." }, { status: 409 });
    }

    await supabase.from("consents").insert({
      study_id: body.studyId,
      participant_session_id: body.sessionId,
      consent_text_version: "v1",
      accepted: body.consentAccepted ?? false,
    });

    if (body.responses.length) {
      await supabase.from("responses").insert(
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
    }

    if (Array.isArray(body.trials) && body.trials.length) {
      await supabase.from("psych_trials").insert(
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
    }

    await supabase.from("events").insert({
      study_id: body.studyId,
      participant_session_id: body.sessionId,
      event_type: "session_duration",
      payload: { durationMs: body.durationMs ?? 0 },
    });

    await supabase
      .from("participant_sessions")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", body.sessionId);

    await writeAuditLog({ route: "/api/participant/complete", action: "session_complete", outcome: "success", ip });
    return NextResponse.json({ ok: true });
  });
}
