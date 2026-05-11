"use client";

import React, { useState, useEffect, useCallback } from "react";
import { User, Calendar, Clock, ChevronRight, FileText, CheckCircle, XCircle, RefreshCw, Radio } from "lucide-react";

export function ParticipantList({
  sessions: initialSessions,
  studyId,
  blocks,
  totalSessionsCount: initialTotal,
}: {
  sessions: any[];
  studyId: string;
  blocks: any[];
  totalSessionsCount?: number;
}) {
  const [sessions, setSessions] = useState<any[]>(initialSessions);
  const [totalCount, setTotalCount] = useState(initialTotal ?? initialSessions.length);
  const [inProgressCount, setInProgressCount] = useState(
    initialSessions.filter((s) => s.status === "in_progress").length
  );
  const [completedCount, setCompletedCount] = useState(
    initialSessions.filter((s) => s.status === "completed").length
  );
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Build question map from blocks
  const questionMap: Record<string, string> = {};
  blocks.forEach((b) => {
    if (Array.isArray(b.config?.questions)) {
      b.config.questions.forEach((q: any) => {
        const qText = q.question || b.label;
        questionMap[q.id] = qText;
        questionMap[`survey_${q.id}`] = qText;
        questionMap[`mcq_${q.id}`] = qText;
        questionMap[`likert_${q.id}`] = qText;
        questionMap[`text_${q.id}`] = qText;
        if (q.questionKey) questionMap[q.questionKey] = qText;
      });
    } else {
      const qText = b.config?.question || b.config?.prompt || b.config?.instruction || b.label;
      if (qText) {
        const explicitKey = b.config?.questionKey;
        if (explicitKey) questionMap[explicitKey] = qText;
        questionMap[b.id] = qText;
        questionMap[`survey_${b.id}`] = qText;
        questionMap[`mcq_${b.id}`] = qText;
        questionMap[`brs_${b.id}`] = qText;
      }
    }
  });

  // Fetch live session list
  const refreshSessions = useCallback(async () => {
    if (!studyId) return;
    try {
      setIsPolling(true);
      const res = await fetch(`/api/admin/sessions?studyId=${studyId}&t=${Date.now()}`);
      if (!res.ok) return;
      const data = await res.json();
      setSessions(data.sessions ?? []);
      setTotalCount(data.totalCount ?? 0);
      setInProgressCount(data.inProgressCount ?? 0);
      setCompletedCount(data.completedCount ?? 0);
      setLastRefreshed(new Date());
    } catch {
      // silently fail – keep showing old data
    } finally {
      setIsPolling(false);
    }
  }, [studyId]);

  useEffect(() => {
    setMounted(true);
    // Initial refresh immediately
    refreshSessions();

    // Auto-poll every 30 seconds
    const interval = setInterval(refreshSessions, 30_000);
    return () => clearInterval(interval);
  }, [refreshSessions]);

  async function viewResponses(sessionId: string) {
    if (selectedSessionId === sessionId) {
      setSelectedSessionId(null);
      return;
    }

    setSelectedSessionId(sessionId);
    setIsLoading(true);
    try {
      const s = sessions.find((sess) => sess.id === sessionId);
      const res = await fetch(`/api/admin/sessions/${sessionId}/responses?t=${Date.now()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to fetch responses");

      const sessionResponses = data.responses || [];
      const meta = [
        { key: "Browser", value: s?.browser || "unknown" },
        { key: "OS", value: s?.os || "unknown" },
        { key: "Device", value: s?.device || "unknown" },
        { key: "IP Address", value: s?.ip_address || "unknown" },
        { key: "Language", value: s?.locale || "unknown" },
      ];

      const kv = sessionResponses.map((r: any) => {
        const val =
          r.numeric_value !== null
            ? r.numeric_value
            : r.text_value || (r.json_value ? JSON.stringify(r.json_value) : "");
        return {
          key: questionMap[r.question_key] || r.question_key.replace(/_/g, " "),
          value: val,
        };
      });

      setResponses([...meta, ...kv]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  const statusColor = (status: string) => {
    if (status === "completed") return "bg-emerald-500/20 text-emerald-400";
    if (status === "in_progress") return "bg-blue-500/20 text-blue-400";
    return "bg-amber-500/20 text-amber-400";
  };

  return (
    <article className="rounded-xl border border-white/15 bg-white/5 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <User className="w-4 h-4 text-[var(--brand)]" />
            Recent Participants
          </h2>
          {/* Live status pills */}
          <div className="flex items-center gap-2">
            {inProgressCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                {inProgressCount} live
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
              <CheckCircle className="w-2.5 h-2.5" />
              {completedCount} done
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest text-white/30">
            {sessions.length} / {totalCount} sessions
          </span>
          <button
            onClick={refreshSessions}
            disabled={isPolling}
            title="Refresh now"
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-[10px] text-white/50 hover:text-white/80"
          >
            <RefreshCw className={`w-3 h-3 ${isPolling ? "animate-spin" : ""}`} />
            {mounted && lastRefreshed
              ? `${Math.round((Date.now() - lastRefreshed.getTime()) / 1000)}s ago`
              : "Refresh"}
          </button>
        </div>
      </div>

      {/* Auto-refresh notice */}
      <div className="px-4 py-2 bg-blue-500/5 border-b border-blue-500/10 flex items-center gap-2">
        <Radio className="w-3 h-3 text-blue-400 animate-pulse" />
        <p className="text-[10px] text-blue-400/70">
          Auto-refreshing every 30 seconds — new participants appear automatically
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-white/5 text-white/40">
              <th className="px-4 py-2 font-medium">Started At</th>
              <th className="px-4 py-2 font-medium">ID / Token</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Device</th>
              <th className="px-4 py-2 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sessions.map((s) => (
              <React.Fragment key={s.id}>
                <tr
                  className={`hover:bg-white/5 transition-colors group ${
                    s.status === "in_progress" ? "border-l-2 border-l-blue-500/40" : ""
                  }`}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-white/80">
                        {mounted ? new Date(s.started_at).toLocaleDateString() : "Loading..."}
                      </span>
                      <span className="text-[10px] text-white/30">
                        {mounted ? new Date(s.started_at).toLocaleTimeString() : "--:--"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-white/40 text-[10px] truncate max-w-[120px]">
                    {s.id}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColor(
                        s.status
                      )}`}
                    >
                      {s.status === "completed" ? (
                        <CheckCircle className="w-2.5 h-2.5" />
                      ) : s.status === "in_progress" ? (
                        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                      ) : (
                        <Clock className="w-2.5 h-2.5" />
                      )}
                      {s.status === "in_progress" ? "In Progress" : s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/40">{s.device || "unknown"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => viewResponses(s.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
                    >
                      <FileText className="w-3 h-3" />
                      {selectedSessionId === s.id ? "Hide" : "Inspect"}
                    </button>
                  </td>
                </tr>
                {selectedSessionId === s.id && (
                  <tr className="bg-black/40">
                    <td colSpan={5} className="p-4">
                      <div className="rounded-lg border border-[var(--brand)]/20 bg-[var(--brand)]/5 p-4 animate-in fade-in slide-in-from-top-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--brand)] mb-3 flex items-center gap-2">
                          <ChevronRight className="w-3 h-3" />
                          Participant Data Snapshot
                        </h3>
                        {isLoading ? (
                          <p className="text-white/30 italic">Loading responses...</p>
                        ) : responses.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {responses.map((r) => (
                              <div key={r.key} className="space-y-1">
                                <p className="text-[10px] uppercase tracking-tighter text-white/30">
                                  {r.key.replace(/_/g, " ")}
                                </p>
                                <p className="text-sm font-medium text-white">{String(r.value)}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-white/30 italic">
                            No responses recorded yet for this session.
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-white/20 italic">
                  No participant activity recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}
