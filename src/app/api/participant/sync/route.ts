import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { withTiming } from "@/lib/telemetry";
import { enforceRateLimit, getClientIp, requireTrustedOrigin } from "@/lib/security/request-guards";

type ResponsePayload = {
  questionKey: string;
  responseType: "text" | "likert" | "mcq" | "task" | "time_ms";
  textValue?: string;
  numericValue?: number;
  jsonValue?: Record<string, unknown>;
};

export async function POST(request: Request) {
  return withTiming("participant.sync", async () => {
    const ip = getClientIp(request);
    const originGuard = requireTrustedOrigin(request);
    if (!originGuard.ok) return originGuard.response;
    
    const rateGuard = enforceRateLimit(request, "participant-sync", 100, 60_000); // Higher limit for syncing
    if (!rateGuard.ok) return rateGuard.response;

    const supabase = createAdminSupabaseClient();
    if (!supabase) return NextResponse.json({ error: "Supabase admin not configured." }, { status: 500 });

    const body = await request.json().catch(() => null);
    const { studyId, sessionId, participantToken, responses } = body || {};

    if (!studyId || !sessionId || !participantToken || !Array.isArray(responses)) {
      return NextResponse.json({ error: "Invalid sync payload." }, { status: 400 });
    }

    // 1. Verify session
    const { data: session, error: sessionError } = await supabase
      .from("participant_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("participant_token", participantToken)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    if (responses.length > 0) {
      // Deduplicate by question_key to avoid batch conflict errors in atomic upsert
      const responseMap = new Map();
      responses.forEach((item) => {
        responseMap.set(item.questionKey, {
          study_id: studyId,
          participant_session_id: sessionId,
          question_key: item.questionKey,
          response_type: item.responseType,
          text_value: item.textValue,
          numeric_value: item.numericValue,
          json_value: item.jsonValue,
        });
      });

      const { error: upsertError } = await supabase
        .from("responses")
        .upsert(Array.from(responseMap.values()), { onConflict: "participant_session_id,question_key" });

      if (upsertError) {
        return NextResponse.json({ error: upsertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  });
}
