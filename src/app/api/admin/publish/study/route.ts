import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthenticatedUserId } from "@/lib/supabase/server";
import { enforceRateLimit, enforceReplayProtection, requireTrustedOrigin } from "@/lib/security/request-guards";

export async function POST(request: Request) {
  const originGuard = requireTrustedOrigin(request);
  if (!originGuard.ok) return originGuard.response;
  const rateGuard = enforceRateLimit(request, "admin-publish-study", 30, 60_000);
  if (!rateGuard.ok) return rateGuard.response;
  const replayGuard = await enforceReplayProtection(request, "/api/admin/publish/study");
  if (!replayGuard.ok) return replayGuard.response;

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as { studyPublicId?: string } | null;
  const studyPublicId = body?.studyPublicId;
  if (!studyPublicId) {
    return NextResponse.json({ error: "studyPublicId is required." }, { status: 400 });
  }

  const { data: study, error: studyError } = await supabase
    .from("studies")
    .update({ status: "published" })
    .eq("public_id", studyPublicId)
    .select("id,public_id,title")
    .single();

  if (studyError || !study) {
    return NextResponse.json({ error: "Study not found or publish failed." }, { status: 404 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const url = `${baseUrl}/participant/${study.public_id}`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`;

  return NextResponse.json({ ok: true, url, qr });
}
