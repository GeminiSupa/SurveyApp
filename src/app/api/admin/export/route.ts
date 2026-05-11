import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const studyId = searchParams.get("studyId");
  const statusFilter = searchParams.get("status");

  if (!studyId) {
    return NextResponse.json({ error: "Missing studyId" }, { status: 400 });
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  // 1. Fetch sessions
  let sessionQuery = supabase
    .from("participant_sessions")
    .select("id, started_at, completed_at, status, device, locale")
    .eq("study_id", studyId)
    .order("started_at", { ascending: true });
  
  if (statusFilter) {
    sessionQuery = sessionQuery.eq("status", statusFilter);
  }

  const { data: sessions, error: sessionError } = await sessionQuery.limit(2000);
  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });

  const sessionIds = (sessions ?? []).map(s => s.id);
  if (sessionIds.length === 0) {
    return NextResponse.json({ rows: [], meta: { totalParticipants: 0 } });
  }

  // 2. Fetch responses with PAGINATION to bypass the 1000-row server limit
  const allResponses: any[] = [];
  let from = 0;
  const PAGE_SIZE = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: pageData, error: pageError } = await supabase
      .from("responses")
      .select(`
        participant_session_id, 
        question_key, 
        response_type, 
        text_value, 
        numeric_value, 
        json_value, 
        created_at
      `)
      .in("participant_session_id", sessionIds)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (pageError) {
      console.error("[Export] Pagination error:", pageError);
      break;
    }

    if (pageData && pageData.length > 0) {
      allResponses.push(...pageData);
      if (pageData.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        from += PAGE_SIZE;
      }
    } else {
      hasMore = false;
    }

    // Safety break to prevent infinite loops
    if (from > 100000) break;
  }

  console.log(`[Export] Successfully fetched ${allResponses.length} total responses for ${sessionIds.length} sessions.`);

  // 3. Build the Wide-Format Map
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

  allResponses.forEach((r) => {
    const sid = r.participant_session_id;
    if (sessionsMap[sid]) {
      let value: any = "";
      if (r.numeric_value !== null && r.numeric_value !== undefined) {
        value = r.numeric_value;
      } else if (r.text_value) {
        value = r.text_value;
      } else if (r.json_value) {
        value = typeof r.json_value === 'string' ? r.json_value : JSON.stringify(r.json_value);
      }

      const columnHeader = r.question_key || "unknown_question";
      sessionsMap[sid][columnHeader] = value;
    }
  });

  const wideRows = Object.values(sessionsMap);

  return NextResponse.json({ 
    rows: wideRows,
    sessionsMap,
    meta: {
      totalParticipants: wideRows.length,
      totalResponses: allResponses.length,
      exportTime: new Date().toISOString(),
      filter: statusFilter || "all"
    }
  }, {
    headers: {
      "Cache-Control": "no-store, max-age=0"
    }
  });
}
