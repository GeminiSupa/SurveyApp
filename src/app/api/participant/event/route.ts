import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/security/audit";
import { enforceRateLimit, enforceReplayProtection, getClientIp, requireTrustedOrigin } from "@/lib/security/request-guards";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const originGuard = requireTrustedOrigin(request);
  if (!originGuard.ok) return originGuard.response;
  const rateGuard = enforceRateLimit(request, "participant-event", 120, 60_000);
  if (!rateGuard.ok) return rateGuard.response;
  const replayGuard = await enforceReplayProtection(request, "/api/participant/event");
  if (!replayGuard.ok) return replayGuard.response;

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    await writeAuditLog({ route: "/api/participant/event", action: "bootstrap", outcome: "error", ip });
    return NextResponse.json({ error: "Supabase admin client not configured." }, { status: 500 });
  }

  const payload = (await request.json().catch(() => null)) as {
    studyId?: string;
    sessionId?: string;
    participantToken?: string;
    eventType?: string;
    payload?: Record<string, unknown>;
  } | null;
  if (!payload?.studyId || !payload.sessionId || !payload.participantToken || !payload.eventType) {
    return NextResponse.json({ error: "studyId, sessionId, participantToken, and eventType are required." }, { status: 400 });
  }

  const { data: session, error: sessionError } = await supabase
    .from("participant_sessions")
    .select("id,status,study_id")
    .eq("id", payload.sessionId)
    .eq("participant_token", payload.participantToken)
    .single();
  if (sessionError || !session) {
    await writeAuditLog({ route: "/api/participant/event", action: "session_validate", outcome: "blocked", ip });
    return NextResponse.json({ error: "Invalid participant session token." }, { status: 403 });
  }
  if (session.study_id !== payload.studyId) {
    return NextResponse.json({ error: "Session does not belong to this study." }, { status: 409 });
  }

  const { error } = await supabase.from("events").insert({
    study_id: payload.studyId,
    participant_session_id: payload.sessionId,
    event_type: payload.eventType,
    payload: payload.payload ?? {},
  });

  if (error) {
    await writeAuditLog({ route: "/api/participant/event", action: "event_insert", outcome: "error", ip });
    return NextResponse.json({ error: "Could not save event." }, { status: 500 });
  }
  await writeAuditLog({ route: "/api/participant/event", action: "event_insert", outcome: "success", ip });
  return NextResponse.json({ ok: true });
}
