import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { StudyRunner } from "./study-runner";

type Props = {
  params: Promise<{ studyId: string }>;
  searchParams: Promise<{ t?: string }>;
};

export default async function ParticipantStudyPage({ params, searchParams }: Props) {
  const { studyId } = await params;
  const { t } = await searchParams;
  const admin = createAdminSupabaseClient();

  if (!admin) {
    return (
      <section className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm">
        Service unavailable. Please try again later.
      </section>
    );
  }

  const { data: study } = await admin
    .from("studies")
    .select("id,public_id,title,status")
    .eq("public_id", studyId)
    .single();

  if (!study) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-3">
          <h2 className="text-xl font-bold text-white">Study Not Found</h2>
          <p className="text-white/50 text-sm">
            This study link may be invalid or has been removed.
          </p>
        </div>
      </div>
    );
  }

  if (study.status !== "published") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-3">
          <h2 className="text-xl font-bold text-white">Study Not Available</h2>
          <p className="text-white/50 text-sm">
            This study is not currently accepting responses.
          </p>
        </div>
      </div>
    );
  }

  const [{ data: blocks }, { data: logicRules }, { data: disqualificationRules }] = await Promise.all([
    admin
      .from("study_blocks")
      .select("id,block_type,label,sort_order,config")
      .eq("study_id", study.id)
      .order("sort_order", { ascending: true }),
    admin
      .from("logic_rules")
      .select("id,source_block_id,condition,target_block_id,terminate")
      .eq("study_id", study.id),
    admin
      .from("disqualification_rules")
      .select("id,condition,disqualify_message")
      .eq("study_id", study.id),
  ]);

  return (
    <StudyRunner
      studyId={study.public_id}
      studyDbId={study.id}
      blocks={blocks ?? []}
      magicToken={t ?? null}
      logicRules={logicRules ?? []}
      disqualificationRules={disqualificationRules ?? []}
    />
  );
}
