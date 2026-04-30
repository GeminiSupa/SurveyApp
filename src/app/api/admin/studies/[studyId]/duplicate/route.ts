import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserId } from "@/lib/supabase/server";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 30);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ studyId: string }> }
) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable" }, { status: 500 });

  const { studyId } = await params;

  // 1. Get original study
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
    return NextResponse.json({ error: "Original study not found" }, { status: 404 });
  }

  // 2. Create duplicated study
  const newTitle = `${study.title} (Copy)`;
  const basePublicId = slugify(newTitle);
  const newPublicId = `${basePublicId || "study"}-${Math.floor(Math.random() * 10000)}`;

  const { data: newStudy, error: newStudyErr } = await admin
    .from("studies")
    .insert({
      project_id: study.project_id,
      title: newTitle,
      public_id: newPublicId,
      status: "draft", // Always duplicate as draft
      config: study.config,
    })
    .select("id")
    .single();

  if (newStudyErr || !newStudy) {
    return NextResponse.json({ error: "Failed to duplicate study" }, { status: 500 });
  }

  // 3. Duplicate blocks with ID mapping
  const blockIdMap = new Map<string, string>();
  
  if (study.study_blocks && study.study_blocks.length > 0) {
    const blocksToInsert = study.study_blocks.map((b: any) => {
      const newId = crypto.randomUUID();
      blockIdMap.set(b.id, newId);
      return {
        id: newId,
        study_id: newStudy.id,
        block_type: b.block_type,
        label: b.label,
        sort_order: b.sort_order,
        config: b.config,
      };
    });
    await admin.from("study_blocks").insert(blocksToInsert);
  }

  // 4. Duplicate logic rules using mapped IDs
  if (study.logic_rules && study.logic_rules.length > 0) {
    const rulesToInsert = study.logic_rules.map((r: any) => {
      const { id, created_at, ...rest } = r;
      // Also rewrite condition questionKeys if they contain the old block ID
      let newCondition = rest.condition;
      if (newCondition?.questionKey && typeof newCondition.questionKey === 'string') {
        const match = newCondition.questionKey.match(/^(.*_)((?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}))$/i);
        if (match && blockIdMap.has(match[2])) {
           newCondition = { ...newCondition, questionKey: match[1] + blockIdMap.get(match[2]) };
        }
      }

      return { 
        ...rest, 
        study_id: newStudy.id,
        source_block_id: blockIdMap.get(rest.source_block_id) || rest.source_block_id,
        target_block_id: rest.target_block_id ? (blockIdMap.get(rest.target_block_id) || rest.target_block_id) : null,
        condition: newCondition
      };
    });
    await admin.from("logic_rules").insert(rulesToInsert);
  }

  // 5. Duplicate disqualification rules using mapped IDs
  if (study.disqualification_rules && study.disqualification_rules.length > 0) {
    const rulesToInsert = study.disqualification_rules.map((r: any) => {
      const { id, created_at, ...rest } = r;
      
      let newCondition = rest.condition;
      if (newCondition?.questionKey && typeof newCondition.questionKey === 'string') {
        const match = newCondition.questionKey.match(/^(.*_)((?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}))$/i);
        if (match && blockIdMap.has(match[2])) {
           newCondition = { ...newCondition, questionKey: match[1] + blockIdMap.get(match[2]) };
        }
      }

      return { 
        ...rest, 
        study_id: newStudy.id,
        condition: newCondition
      };
    });
    await admin.from("disqualification_rules").insert(rulesToInsert);
  }

  return NextResponse.json({ ok: true, newStudyId: newStudy.id });
}
