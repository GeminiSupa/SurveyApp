import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthenticatedUserId } from "@/lib/supabase/server";
import { enforceRateLimit, enforceReplayProtection, requireTrustedOrigin } from "@/lib/security/request-guards";

export async function POST(request: Request) {
  const originGuard = requireTrustedOrigin(request);
  if (!originGuard.ok) return originGuard.response;
  const rateGuard = enforceRateLimit(request, "admin-publish-magic-link", 30, 60_000);
  if (!rateGuard.ok) return rateGuard.response;
  const replayGuard = await enforceReplayProtection(request, "/api/admin/publish/magic-link");
  if (!replayGuard.ok) return replayGuard.response;

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as { studyPublicId?: string; groupName?: string } | null;
  const studyPublicId = body?.studyPublicId;
  const groupName = body?.groupName;
  if (!studyPublicId) {
    return NextResponse.json({ error: "studyPublicId is required." }, { status: 400 });
  }

  const { data: study, error: studyError } = await supabase
    .from("studies")
    .select("id,public_id")
    .eq("public_id", studyPublicId)
    .single();
  if (studyError || !study) {
    return NextResponse.json({ error: "Study not found." }, { status: 404 });
  }

  let audienceId: string | null = null;
  if (groupName) {
    const { data: audience } = await supabase.from("audiences").select("id").eq("name", groupName).limit(1).maybeSingle();
    audienceId = audience?.id ?? null;
  }

  const { data: link, error: linkError } = await supabase
    .from("magic_links")
    .insert({
      study_id: study.id,
      audience_id: audienceId,
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      max_uses: 2000,
    })
    .select("token")
    .single();

  if (linkError || !link) {
    return NextResponse.json({ error: "Could not create link." }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const url = `${baseUrl}/participant/${study.public_id}?t=${link.token}`;
  return NextResponse.json({ ok: true, url });
}
