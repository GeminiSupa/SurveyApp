import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthenticatedUserId } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const studyId = searchParams.get("studyId");

  if (!studyId) {
    return NextResponse.json({ error: "Missing studyId" }, { status: 400 });
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  // Fetch all participant sessions so exports include sessions even when
  // response rows are missing or partially written.
  const { data: sessions, error: sessionError } = await supabase
    .from("participant_sessions")
    .select("id, started_at, completed_at, status, device, locale")
    .eq("study_id", studyId)
    .order("started_at", { ascending: true });

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }

  // Fetch responses and merge into the session rows.
  const { data: responses, error: responseError } = await supabase
    .from("responses")
    .select(`
      participant_session_id, 
      question_key, 
      response_type, 
      text_value, 
      numeric_value, 
      json_value, 
      created_at,
      participant_sessions (
        started_at,
        completed_at,
        status,
        device,
        locale
      )
    `)
    .eq("study_id", studyId)
    .order("created_at", { ascending: true });

  if (responseError) {
    return NextResponse.json({ error: responseError.message }, { status: 500 });
  }

  // Pivot data into Wide Format (One row per session)
  const sessionsMap: Record<string, any> = {};

  (sessions ?? []).forEach((s) => {
    sessionsMap[s.id] = {
      ParticipantID: s.id,
      StartedAt: s.started_at,
      CompletedAt: s.completed_at,
      Status: s.status,
      Device: s.device || "unknown",
      Locale: s.locale || "unknown",
    };
  });

  (responses ?? []).forEach((r) => {
    const sid = r.participant_session_id;
    if (!sessionsMap[sid]) {
      // Fallback for orphaned response rows.
      const s = Array.isArray(r.participant_sessions) ? r.participant_sessions[0] : r.participant_sessions;
      
      sessionsMap[sid] = {
        ParticipantID: sid,
        StartedAt: s?.started_at,
        CompletedAt: s?.completed_at,
        Status: s?.status,
        Device: s?.device || "unknown",
        Locale: s?.locale || "unknown",
      };
    }
    
    // Determine the value to show (prefer numeric, then text, then JSON)
    let value = "";
    if (r.numeric_value !== null && r.numeric_value !== undefined) {
      value = r.numeric_value;
    } else if (r.text_value) {
      value = r.text_value;
    } else if (r.json_value) {
      value = typeof r.json_value === 'string' ? r.json_value : JSON.stringify(r.json_value);
    }

    // Use question_key as the column header
    const columnHeader = r.question_key || "unknown_question";
    sessionsMap[sid][columnHeader] = value;
  });

  const wideRows = Object.values(sessionsMap);

  return NextResponse.json({ 
    rows: wideRows,
    meta: {
      totalParticipants: wideRows.length,
      exportTime: new Date().toISOString()
    }
  });
}
