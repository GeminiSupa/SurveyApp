import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserId } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const studyId = searchParams.get("studyId");

  if (!studyId) {
    return NextResponse.json({ error: "Missing studyId" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
  }

  const { data: sessions, error } = await supabase
    .from("participant_sessions")
    .select("id, started_at, completed_at, status, device, locale, browser, os, ip_address")
    .eq("study_id", studyId)
    .order("started_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Also return counts
  const { count: totalCount } = await supabase
    .from("participant_sessions")
    .select("id", { count: "exact", head: true })
    .eq("study_id", studyId);

  const { count: inProgressCount } = await supabase
    .from("participant_sessions")
    .select("id", { count: "exact", head: true })
    .eq("study_id", studyId)
    .eq("status", "in_progress");

  const { count: completedCount } = await supabase
    .from("participant_sessions")
    .select("id", { count: "exact", head: true })
    .eq("study_id", studyId)
    .eq("status", "completed");

  return NextResponse.json(
    {
      sessions: sessions ?? [],
      totalCount: totalCount ?? 0,
      inProgressCount: inProgressCount ?? 0,
      completedCount: completedCount ?? 0,
    },
    {
      headers: { "Cache-Control": "no-store, max-age=0" },
    }
  );
}
