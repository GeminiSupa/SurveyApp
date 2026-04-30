import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthenticatedUserId } from "@/lib/supabase/server";
import { enforceRateLimit, enforceReplayProtection, requireTrustedOrigin } from "@/lib/security/request-guards";

export async function POST(request: Request) {
  const originGuard = requireTrustedOrigin(request);
  if (!originGuard.ok) return originGuard.response;
  const rateGuard = enforceRateLimit(request, "admin-audience-import", 20, 60_000);
  if (!rateGuard.ok) return rateGuard.response;
  const replayGuard = await enforceReplayProtection(request, "/api/admin/audiences/import");
  if (!replayGuard.ok) return replayGuard.response;

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as { groupName?: string; members?: string[] } | null;
  const groupName = body?.groupName;
  const members = body?.members;
  if (!groupName || !Array.isArray(members)) {
    return NextResponse.json({ error: "groupName and members are required." }, { status: 400 });
  }

  const { data: project, error: projectError } = await supabase.from("projects").select("id").limit(1).single();
  if (projectError || !project) {
    return NextResponse.json({ error: "No project found. Create one in Lab first." }, { status: 400 });
  }

  const { data: audience, error: audienceError } = await supabase
    .from("audiences")
    .insert({ project_id: project.id, name: groupName })
    .select("id")
    .single();
  if (audienceError || !audience) {
    return NextResponse.json({ error: "Could not create audience." }, { status: 500 });
  }

  const payload = members.map((email) => ({
    audience_id: audience.id,
    email,
    label: email.split("@")[0],
  }));
  const { error: membersError } = await supabase.from("audience_members").insert(payload);
  if (membersError) {
    return NextResponse.json({ error: "Audience created, but member import failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, imported: payload.length });
}
