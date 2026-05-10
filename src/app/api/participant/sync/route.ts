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

    // 2. Incremental Sync (Upsert Logic)
    // We handle this by deleting existing responses for these keys and inserting the new ones.
    // This avoids duplicates in the analytics.
    const keysToSync = responses.map(r => r.questionKey);
    
    if (keysToSync.length > 0) {
      // Cleanup old versions of these specific questions
      await supabase
        .from("responses")
        .delete()
        .eq("participant_session_id", sessionId)
        .in("question_key", keysToSync);

      // Insert new versions
      const { error: insertError } = await supabase.from("responses").insert(
        responses.map((item) => ({
          study_id: studyId,
          participant_session_id: sessionId,
          question_key: item.questionKey,
          response_type: item.responseType,
          text_value: item.textValue,
          numeric_value: item.numericValue,
          json_value: item.jsonValue,
        }))
      );

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  });
}
