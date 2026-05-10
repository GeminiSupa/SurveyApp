import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  clampReactionTime,
  computeIatMetrics,
  computeSpeederFlag,
  computeStraightLiningFlag,
  readIatThresholds,
} from "@/lib/runtime/quality";
import { HeatmapOverlay } from "@/app/(admin)/admin/analytics/heatmap-overlay";
import { ThresholdsForm } from "@/app/(admin)/admin/analytics/thresholds-form";
import { ExportControls } from "@/app/(admin)/admin/analytics/export-controls";
import { StatusToggle } from "@/app/(admin)/admin/analytics/status-toggle";
import { ParticipantList } from "@/app/(admin)/admin/analytics/participant-list";
import { VisualSummary } from "@/app/(admin)/admin/analytics/visual-summary";

async function getAnalytics(studyId?: string) {
  const client = createAdminSupabaseClient();
  if (!client) {
    return {
      durations: [],
      reactions: [],
      heatmap: [],
      likerts: [],
      sessions: [],
      studies: [],
      selectedStudyId: "",
      thresholds: readIatThresholds(),
      blocks: [],
      responses: [],
      completedCount: 0,
      completedWithDataCount: 0,
      totalSessionsCount: 0,
      completedSessionsForAudit: 0,
      integrityFlags: [],
    };
  }

  const { data: studies } = await client.from("studies").select("id,title,status,config").order("created_at", { ascending: false }).limit(30);
  const selectedStudyId = studyId ?? studies?.[0]?.id ?? "";
  const selectedStudy = (studies ?? []).find((s) => s.id === selectedStudyId);
  const thresholds = readIatThresholds((selectedStudy?.config ?? {}) as Record<string, unknown>);

  const [
    eventResult,
    reactionResult,
    heatmapResult,
    responseResult,
    sessionResult,
    blocksResult,
    completedCountResult,
    totalSessionsCountResult,
    completedSessionsResult,
    responseKeysResult,
  ] = await Promise.all([
    client
      .from("events")
      .select("payload")
      .eq("event_type", "session_duration")
      .eq("study_id", selectedStudyId)
      .limit(10000),
    client
      .from("psych_trials")
      .select("reaction_time_ms,trial_type,is_correct,payload,participant_session_id")
      .eq("study_id", selectedStudyId)
      .limit(50000),
    client.from("events").select("payload").eq("event_type", "first_click").eq("study_id", selectedStudyId).limit(20000),
    client.from("responses").select("numeric_value,text_value,question_key,response_type").eq("study_id", selectedStudyId).limit(100000),
    client.from("participant_sessions").select("*").eq("study_id", selectedStudyId).order("started_at", { ascending: false }).limit(1000),
    client.from("study_blocks").select("id,block_type,config,label").eq("study_id", selectedStudyId).order("sort_order", { ascending: true }),
    client
      .from("participant_sessions")
      .select("id", { count: "exact", head: true })
      .eq("study_id", selectedStudyId)
      .eq("status", "completed"),
    client
      .from("participant_sessions")
      .select("id", { count: "exact", head: true })
      .eq("study_id", selectedStudyId),
    client
      .from("participant_sessions")
      .select("id, started_at, completed_at")
      .eq("study_id", selectedStudyId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false }),
    client
      .from("responses")
      .select("participant_session_id")
      .eq("study_id", selectedStudyId),
  ]);
  const { data: thresholdHistory } = selectedStudyId
    ? await client
        .from("study_threshold_audit_logs")
        .select("id,changed_at,preset_name,actor_user_id,old_thresholds,new_thresholds")
        .eq("study_id", selectedStudyId)
        .order("changed_at", { ascending: false })
        .limit(20)
    : { data: [] };

  const responseCountsBySession = new Map<string, number>();
  for (const row of responseKeysResult.data ?? []) {
    const sid = row.participant_session_id;
    if (!sid) continue;
    responseCountsBySession.set(sid, (responseCountsBySession.get(sid) ?? 0) + 1);
  }
  const completedSessions = completedSessionsResult.data ?? [];
  const completedWithDataCount = completedSessions.filter(
    (s) => (responseCountsBySession.get(s.id) ?? 0) > 0,
  ).length;
  const integrityFlags = completedSessions
    .map((s) => ({
      participantSessionId: s.id,
      startedAt: s.started_at,
      completedAt: s.completed_at,
      responseCount: responseCountsBySession.get(s.id) ?? 0,
    }))
    .filter((row) => row.responseCount === 0 || row.responseCount <= 2);

  return {
    durations: (eventResult.data ?? []).map((item) => Number(item.payload?.durationMs ?? 0)),
    reactions: reactionResult.data ?? [],
    heatmap: heatmapResult.data ?? [],
    likerts: (responseResult.data ?? []).filter(r => r.response_type === 'likert').map((r) => Number(r.numeric_value ?? 0)),
    studies: studies ?? [],
    selectedStudyId,
    selectedStudy,
    thresholds,
    sessions: sessionResult.data ?? [],
    responses: responseResult.data ?? [],
    blocks: blocksResult.data ?? [],
    thresholdHistory: thresholdHistory ?? [],
    completedCount: completedCountResult.count ?? 0,
    completedWithDataCount,
    totalSessionsCount: totalSessionsCountResult.count ?? 0,
    completedSessionsForAudit: completedSessions.length,
    integrityFlags,
  };
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ studyId?: string }>;
}) {
  const { studyId } = await searchParams;
  const data = await getAnalytics(studyId);
  const avgDuration = data.durations.length
    ? Math.round(data.durations.reduce((acc, value) => acc + value, 0) / data.durations.length)
    : 0;
  const cleanedReactions = data.reactions
    .map((item) => clampReactionTime(Number(item.reaction_time_ms ?? 0)))
    .filter((n) => n > 0);
  const avgReaction = cleanedReactions.length
    ? Math.round(cleanedReactions.reduce((acc, n) => acc + n, 0) / cleanedReactions.length)
    : 0;
  const correctRate = data.reactions.length
    ? Math.round((data.reactions.filter((item) => item.is_correct).length / data.reactions.length) * 100)
    : 0;
  const iatMetrics = computeIatMetrics(data.reactions as Array<Record<string, unknown>>, data.thresholds);
  const blockScores = iatMetrics.blockScores ?? [];
  const sessionExclusions = iatMetrics.sessionExclusions ?? [];
  const speederRate = data.durations.length
    ? Math.round((data.durations.filter((d) => computeSpeederFlag(d)).length / data.durations.length) * 100)
    : 0;
  const straightLineFlag = computeStraightLiningFlag(data.likerts);

  return (
    <section className="grid gap-4">
      <h1 className="text-2xl font-semibold">Results & Analytics</h1>
      <p className="text-sm text-[var(--muted)]">Unified UX and psychology reporting with live-ready metrics.</p>
      <div className="grid gap-4 sm:grid-cols-[1fr_320px_280px]">
        <article className="rounded-xl border border-white/15 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">Study Scope</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.studies.map((s) => (
              <a
                key={s.id}
                href={`/admin/analytics?studyId=${s.id}`}
                className={`rounded-lg border px-2 py-1 text-xs ${s.id === data.selectedStudyId ? "border-[var(--brand)]" : "border-white/20"}`}
              >
                {s.title}
              </a>
            ))}
          </div>
        </article>
        {data.selectedStudyId ? (
          <>
            <StatusToggle 
              studyId={data.selectedStudyId} 
              currentStatus={data.selectedStudy?.status || "draft"} 
            />
            <ExportControls 
              studyId={data.selectedStudyId} 
              studyTitle={data.studies.find(s => s.id === data.selectedStudyId)?.title || "Study"}
              blocks={data.blocks}
            />
          </>
        ) : null}
      </div>
      
      <VisualSummary responses={data.responses} blocks={data.blocks} />
      
      <ParticipantList
        sessions={data.sessions}
        studyId={data.selectedStudyId}
        blocks={data.blocks}
        totalSessionsCount={data.totalSessionsCount}
      />
      <div className="grid gap-4 sm:grid-cols-4">
        <article className="rounded-xl border border-white/15 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">Completions With Data</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-400">
            {data.completedWithDataCount}
          </p>
          <p className="mt-1 text-[10px] text-white/40">
            Status says completed: {data.completedCount}
          </p>
        </article>
        <article className="rounded-xl border border-white/15 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">Avg Session Duration</p>
          <p className="mt-2 text-2xl font-semibold">{avgDuration} ms</p>
        </article>
        <article className="rounded-xl border border-white/15 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">Avg Reaction Time</p>
          <p className="mt-2 text-2xl font-semibold">{avgReaction} ms</p>
        </article>
        <article className="rounded-xl border border-white/15 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">IAT Accuracy</p>
          <p className="mt-2 text-2xl font-semibold">{correctRate}%</p>
        </article>
      </div>
      <article className="rounded-xl border border-white/15 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium">Data Integrity Check</h2>
          <p className="text-xs text-[var(--muted)]">
            Completed sessions: {data.completedSessionsForAudit} | Flagged: {data.integrityFlags.length}
          </p>
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Flags completed sessions with zero responses or very low response count (2 or less).
        </p>
        <div className="mt-3 grid gap-2 text-xs">
          {data.integrityFlags.slice(0, 25).map((row) => (
            <div key={row.participantSessionId} className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
              <p className="font-medium">{row.participantSessionId}</p>
              <p className="text-[var(--muted)]">
                responses={row.responseCount} | completedAt={row.completedAt ?? "unknown"}
              </p>
            </div>
          ))}
          {!data.integrityFlags.length ? (
            <p className="text-xs text-emerald-400">No suspiciously incomplete completed sessions detected.</p>
          ) : null}
        </div>
      </article>
      <div className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-white/15 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">IAT Congruent Mean</p>
          <p className="mt-2 text-2xl font-semibold">{iatMetrics.meanCongruentMs} ms</p>
        </article>
        <article className="rounded-xl border border-white/15 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">IAT Incongruent Mean</p>
          <p className="mt-2 text-2xl font-semibold">{iatMetrics.meanIncongruentMs} ms</p>
        </article>
        <article className="rounded-xl border border-white/15 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">IAT D-Score</p>
          <p className="mt-2 text-2xl font-semibold">{iatMetrics.dScore}</p>
        </article>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-xl border border-white/15 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">Data Quality: Speeders</p>
          <p className="mt-2 text-2xl font-semibold">{speederRate}%</p>
          <p className="mt-2 text-xs text-[var(--muted)]">Sessions under 8s are flagged as suspicious.</p>
        </article>
        <article className="rounded-xl border border-white/15 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">Data Quality: Straight-lining</p>
          <p className="mt-2 text-2xl font-semibold">{straightLineFlag ? "Detected" : "Not detected"}</p>
          <p className="mt-2 text-xs text-[var(--muted)]">Checks if Likert answers repeat identically across many items.</p>
        </article>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-xl border border-white/15 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">IAT Exclusion Rate</p>
          <p className="mt-2 text-2xl font-semibold">{iatMetrics.exclusionRate}%</p>
          <p className="mt-2 text-xs text-[var(--muted)]">Trials outside clean RT bounds ({`<=`}300ms or {`>=`}3000ms).</p>
        </article>
        <article className="rounded-xl border border-white/15 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">IAT Error Rate</p>
          <p className="mt-2 text-2xl font-semibold">{iatMetrics.errorRate}%</p>
          <p className="mt-2 text-xs text-[var(--muted)]">Incorrect categorization percentage across IAT trials.</p>
        </article>
      </div>
      <article className="rounded-xl border border-white/15 bg-white/5 p-4">
        <h2 className="text-sm font-medium">IAT Block-level D-Scores</h2>
        <div className="mt-3 grid gap-2 text-sm">
          {blockScores.map((block) => (
            <div key={block.phase} className="rounded-lg border border-white/10 px-3 py-2">
              <p className="font-medium">{block.phase}</p>
              <p className="text-xs text-[var(--muted)]">
                D={block.dScore} | congruent={block.meanCongruentMs}ms | incongruent={block.meanIncongruentMs}ms |
                err={block.errorRate}% | fast={block.fastTrialRate}% | n={block.trialCount}
              </p>
            </div>
          ))}
          {!blockScores.length ? <p className="text-xs text-[var(--muted)]">No IAT block data yet.</p> : null}
        </div>
      </article>
      <article className="rounded-xl border border-white/15 bg-white/5 p-4">
        <h2 className="text-sm font-medium">IAT Session Exclusions</h2>
        <div className="mt-3 grid gap-2 text-xs">
          {sessionExclusions.map((s) => (
            <div key={s.participantSessionId} className="rounded-lg border border-white/10 px-3 py-2">
              <p className="font-medium">{s.participantSessionId}</p>
              <p className="text-[var(--muted)]">
                excluded={String(s.excluded)} | reasons={s.reasons.join(", ") || "none"} | fast={s.fastTrialRatePct}% |
                err={s.errorRatePct}% | n={s.trialCount}
              </p>
            </div>
          ))}
          {!sessionExclusions.length ? (
            <p className="text-xs text-[var(--muted)]">No session-level IAT exclusion records yet.</p>
          ) : null}
        </div>
      </article>
      <article className="rounded-xl border border-white/15 bg-white/5 p-4">
        <h2 className="text-sm font-medium">First Click Heatmap Preview</h2>
        <div className="mt-3">
          <HeatmapOverlay imageUrl="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200" />
        </div>
        <div className="mt-3 grid grid-cols-10 gap-1">
          {Array.from({ length: 100 }).map((_, index) => (
            <div
              key={index}
              className="aspect-square rounded-sm bg-[var(--brand)]/10"
              style={{
                opacity: Math.min(
                  1,
                  data.heatmap.filter((event) => Number(event.payload?.cell ?? -1) === index).length / 5 + 0.12,
                ),
              }}
            />
          ))}
        </div>
      </article>
    </section>
  );
}
