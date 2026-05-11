import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/security/audit";
import { enforceRateLimit, enforceReplayProtection, getClientIp, requireTrustedOrigin } from "@/lib/security/request-guards";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const originGuard = requireTrustedOrigin(request);
  if (!originGuard.ok) {
    await writeAuditLog({ route: "/api/participant/start", action: "origin_check", outcome: "blocked", ip });
    return originGuard.response;
  }
  const rateGuard = enforceRateLimit(request, "participant-start", 20, 60_000);
  if (!rateGuard.ok) {
    await writeAuditLog({ route: "/api/participant/start", action: "rate_limit", outcome: "blocked", ip });
    return rateGuard.response;
  }
  const replayGuard = await enforceReplayProtection(request, "/api/participant/start");
  if (!replayGuard.ok) {
    await writeAuditLog({ route: "/api/participant/start", action: "replay_check", outcome: "blocked", ip });
    return replayGuard.response;
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    await writeAuditLog({ route: "/api/participant/start", action: "bootstrap", outcome: "error", ip });
    return NextResponse.json({ error: "Supabase admin client not configured." }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as { 
    studyPublicId?: string; 
    magicToken?: string;
    resumeSessionId?: string;
    resumeToken?: string;
  } | null;
  const studyPublicId = body?.studyPublicId;
  const magicToken = body?.magicToken;
  const resumeSessionId = body?.resumeSessionId;
  const resumeToken = body?.resumeToken;

  if (!studyPublicId) {
    return NextResponse.json({ error: "studyPublicId required." }, { status: 400 });
  }

  // 0. Handle Resumption
  if (resumeSessionId && resumeToken) {
    const { data: existing, error: resumeError } = await supabase
      .from("participant_sessions")
      .select("id, participant_token, status, current_step, answers_snapshot")
      .eq("id", resumeSessionId)
      .eq("participant_token", resumeToken)
      .single();

    if (existing && existing.status === "in_progress") {
      // Fetch existing responses for this session to pre-populate results state
      const { data: existingResponses } = await supabase
        .from("responses")
        .select("question_key, response_type, text_value, numeric_value, json_value")
        .eq("participant_session_id", existing.id);

      return NextResponse.json({ 
        sessionId: existing.id, 
        participantToken: existing.participant_token,
        currentStep: existing.current_step || 0,
        answersSnapshot: existing.answers_snapshot || {},
        existingResponses: (existingResponses || []).map(r => ({
          question_key: r.question_key,
          response_type: r.response_type,
          text_value: r.text_value,
          numeric_value: r.numeric_value,
          json_value: r.json_value,
        }))
      });
    }
  }

  const { data: study, error: studyError } = await supabase
    .from("studies")
    .select("id,public_id,status")
    .eq("public_id", studyPublicId)
    .single();
  if (studyError) {
    await writeAuditLog({ route: "/api/participant/start", action: "study_lookup", outcome: "error", ip });
    return NextResponse.json({ error: "Study lookup failed." }, { status: 500 });
  }
  if (!study || study.status !== "published") {
    return NextResponse.json({ error: "Study not available." }, { status: 404 });
  }

  if (magicToken) {
    const { data: link, error: linkError } = await supabase
      .from("magic_links")
      .select("id,used_count,max_uses,expires_at")
      .eq("token", magicToken)
      .eq("study_id", study.id)
      .single();
    if (linkError) {
      await writeAuditLog({ route: "/api/participant/start", action: "magic_link_validate", outcome: "error", ip });
      return NextResponse.json({ error: "Magic link validation failed." }, { status: 500 });
    }
    if (!link) {
      return NextResponse.json({ error: "Invalid magic link." }, { status: 403 });
    }
    /* 
    if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "Magic link expired." }, { status: 403 });
    }
    */
    if (link.max_uses && link.used_count >= link.max_uses) {
      return NextResponse.json({ error: "Magic link usage limit reached." }, { status: 403 });
    }
    const { error: updateLinkError } = await supabase.from("magic_links").update({ used_count: link.used_count + 1 }).eq("id", link.id);
    if (updateLinkError) {
      await writeAuditLog({ route: "/api/participant/start", action: "magic_link_increment", outcome: "error", ip });
      return NextResponse.json({ error: "Magic link usage update failed." }, { status: 500 });
    }
  }

  const userAgent = request.headers.get("user-agent") || "unknown";
  let browser = "Other";
  if (userAgent.includes("Chrome")) browser = "Chrome";
  else if (userAgent.includes("Firefox")) browser = "Firefox";
  else if (userAgent.includes("Safari")) browser = "Safari";
  else if (userAgent.includes("Edge")) browser = "Edge";

  let os = "Other";
  if (userAgent.includes("Windows")) os = "Windows";
  else if (userAgent.includes("Mac OS")) os = "macOS";
  else if (userAgent.includes("Android")) os = "Android";
  else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) os = "iOS";

  const { data: session, error: sessionError } = await supabase
    .from("participant_sessions")
    .insert({ 
      study_id: study.id, 
      status: "in_progress",
      device: userAgent.includes("Mobi") ? "mobile" : "desktop",
      browser,
      os,
      ip_address: ip,
      locale: request.headers.get("accept-language")?.split(',')[0] || "unknown"
    })
    .select("id,participant_token")
    .single();

  if (sessionError || !session) {
    console.error("Session Create Error:", sessionError);
    await writeAuditLog({ route: "/api/participant/start", action: "session_create", outcome: "error", ip });
    return NextResponse.json({ error: "Could not create session." }, { status: 500 });
  }

  await writeAuditLog({ route: "/api/participant/start", action: "session_create", outcome: "success", ip });
  return NextResponse.json({ sessionId: session.id, participantToken: session.participant_token });
}
