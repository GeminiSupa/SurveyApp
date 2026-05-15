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

  // ─────────────────────────────────────────────────────────────────────────
  // KEY CANONICALIZATION
  // Early participants (first ~25) had responses stored with keys like
  //   "likert_<uuid>", "mcq_<uuid>", "text_<uuid>"
  // because block_type was the question sub-type at the time of submission.
  // Later participants used "survey_<uuid>" after a code change.
  // These all refer to the SAME question — we normalise to "survey_<uuid>"
  // so every participant lands in the same column.
  //
  // Other prefixes that can vary for the same underlying question UUID:
  //   likert_ / mcq_ / text_ / open_text_ / multiple_choice_
  //   → all canonicalize to survey_<uuid>
  //
  // BRS keys (brs_<blockId>_<itemId>) are already consistent — leave them.
  // ─────────────────────────────────────────────────────────────────────────

  const LEGACY_SURVEY_PREFIXES = [
    "likert_",
    "mcq_",
    "text_",
    "open_text_",
    "multiple_choice_",
  ];

  /**
   * Strips a legacy type-prefix from a key and replaces it with "survey_".
   * Only applies when the remainder looks like a UUID (8-4-4-4-12 hex).
   * Keys that are already canonical (survey_, brs_, etc.) are returned as-is.
   */
  function canonicalizeKey(rawKey: string): string {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const prefix of LEGACY_SURVEY_PREFIXES) {
      if (rawKey.startsWith(prefix)) {
        const remainder = rawKey.slice(prefix.length);
        if (UUID_RE.test(remainder)) {
          return `survey_${remainder}`;
        }
      }
    }
    return rawKey; // already canonical or not a known legacy key
  }

  allResponses.forEach((r) => {
    const sid = r.participant_session_id;
    if (sessionsMap[sid]) {
      let value: any = "";
      if (r.numeric_value !== null && r.numeric_value !== undefined) {
        // Numeric — keep as number
        value = r.numeric_value;
      } else if (r.text_value !== null && r.text_value !== undefined && r.text_value !== "") {
        value = r.text_value;
      } else if (r.json_value !== null && r.json_value !== undefined) {
        // Keep as parsed value — do NOT stringify here; the export client will flatten it
        value = r.json_value;
      }

      // Normalize the key so early & late participants share the same column
      const columnHeader = canonicalizeKey(r.question_key || "unknown_question");

      // Only write if this is the first (earliest) response for this key in the session
      if (sessionsMap[sid][columnHeader] === undefined) {
        sessionsMap[sid][columnHeader] = value;
      }
    }
  });


  const wideRows = Object.values(sessionsMap);

  return NextResponse.json(
    {
      rows: wideRows,
      meta: {
        totalParticipants: wideRows.length,
        totalResponses: allResponses.length,
        exportTime: new Date().toISOString(),
        filter: statusFilter || "all",
      },
    },
    {
      headers: { "Cache-Control": "no-store, max-age=0" },
    }
  );
}
