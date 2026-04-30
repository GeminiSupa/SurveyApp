
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserId } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ studyId: string }> }
) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable" }, { status: 500 });

  const { studyId } = await params;

  // Get study with blocks and logic
  const { data: study, error: studyErr } = await admin
    .from("studies")
    .select(`
      *,
      study_blocks (*),
      logic_rules (*),
      disqualification_rules (*)
    `)
    .eq("id", studyId)
    .single();

  if (studyErr || !study) {
    return NextResponse.json({ error: "Study not found" }, { status: 404 });
  }

  return NextResponse.json(study);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ studyId: string }> }
) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable" }, { status: 500 });

  const { studyId } = await params;
  const body = await request.json();

  // 1. Update study basic info
  const { error: studyUpdateErr } = await admin
    .from("studies")
    .update({
      title: body.title,
      status: body.status,
      config: body.config
    })
    .eq("id", studyId);

  if (studyUpdateErr) return NextResponse.json({ error: studyUpdateErr.message }, { status: 500 });

  // 2. Sync blocks (delete old, insert new - simple way to handle reordering/edits)
  // Warning: This is a simplified approach. In a complex app, you'd want to track IDs.
  await admin.from("study_blocks").delete().eq("study_id", studyId);
  
  if (body.blocks?.length) {
    const blocksToInsert = body.blocks.map((b: any, index: number) => ({
      id: b.id,
      study_id: studyId,
      block_type: b.blockType,
      label: b.label,
      sort_order: index + 1,
      config: b.config
    }));
    await admin.from("study_blocks").insert(blocksToInsert);
  }

  // 3. Logic rules
  await admin.from("logic_rules").delete().eq("study_id", studyId);
  if (body.logicRules?.length) {
    const rules = body.logicRules.map((r: any) => ({ ...r, study_id: studyId }));
    await admin.from("logic_rules").insert(rules);
  }

  // 4. Disqualification
  await admin.from("disqualification_rules").delete().eq("study_id", studyId);
  if (body.disqualificationRules?.length) {
    const rules = body.disqualificationRules.map((r: any) => ({ ...r, study_id: studyId }));
    await admin.from("disqualification_rules").insert(rules);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ studyId: string }> }
) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable" }, { status: 500 });

  const { studyId } = await params;

  // Manually cleanup related tables if cascade is not configured
  await Promise.all([
    admin.from("responses").delete().eq("study_id", studyId),
    admin.from("study_blocks").delete().eq("study_id", studyId),
    admin.from("logic_rules").delete().eq("study_id", studyId),
    admin.from("disqualification_rules").delete().eq("study_id", studyId),
    admin.from("friction_alerts").delete().filter("study_id", "eq", studyId),
  ]);

  const { error } = await admin.from("studies").delete().eq("id", studyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
