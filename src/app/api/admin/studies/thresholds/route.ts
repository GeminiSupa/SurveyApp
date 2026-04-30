import { NextResponse } from "next/server";
import { createServerSupabaseClient, getAuthenticatedUserId } from "@/lib/supabase/server";
import { readIatThresholds } from "@/lib/runtime/quality";

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });

  const body = (await request.json().catch(() => null)) as
    | { studyId?: string; iatThresholds?: Record<string, unknown>; presetName?: string }
    | null;
  if (!body?.studyId || !body.iatThresholds) {
    return NextResponse.json({ error: "studyId and iatThresholds are required." }, { status: 400 });
  }

  const thresholds = readIatThresholds({ iatThresholds: body.iatThresholds });
  const { data: study, error: readError } = await supabase.from("studies").select("id,config").eq("id", body.studyId).single();
  if (readError || !study) return NextResponse.json({ error: "Study not found." }, { status: 404 });

  const nextConfig = { ...(study.config ?? {}), iatThresholds: thresholds };
  const { error: updateError } = await supabase.from("studies").update({ config: nextConfig }).eq("id", study.id);
  if (updateError) return NextResponse.json({ error: "Could not update thresholds." }, { status: 500 });

  const { error: auditError } = await supabase.from("study_threshold_audit_logs").insert({
    study_id: study.id,
    actor_user_id: userId,
    preset_name: body.presetName ?? null,
    old_thresholds: ((study.config ?? {}) as Record<string, unknown>).iatThresholds ?? {},
    new_thresholds: thresholds,
  });
  if (auditError) {
    return NextResponse.json({ error: "Threshold updated but audit logging failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, iatThresholds: thresholds });
}
