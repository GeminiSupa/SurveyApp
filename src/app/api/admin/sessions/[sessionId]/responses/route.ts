import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserId } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable" }, { status: 500 });

  const { sessionId } = await params;

  // Fetch responses for this session
  const { data: responses, error } = await admin
    .from("responses")
    .select("*")
    .eq("participant_session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ responses });
}
