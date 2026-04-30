"use client";

import React, { useState, useEffect } from "react";
import { User, Calendar, Clock, ChevronRight, FileText, CheckCircle, XCircle } from "lucide-react";

export function ParticipantList({ sessions, studyId, blocks }: { sessions: any[]; studyId: string; blocks: any[] }) {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Map blocks to get question labels
  const questionMap: Record<string, string> = {};
  blocks.forEach(b => {
    // Handle multiple questions per block
    if (Array.isArray(b.config?.questions)) {
      b.config.questions.forEach((q: any) => {
        const qText = q.question || b.label;
        const qId = q.id;
        
        // Map various possible keys to the question text
        questionMap[qId] = qText;
        questionMap[`survey_${qId}`] = qText;
        questionMap[`mcq_${qId}`] = qText;
        questionMap[`likert_${qId}`] = qText;
        questionMap[`text_${qId}`] = qText;
      });
    } else {
      // Legacy single question blocks
      const qText = b.config?.question || b.config?.prompt || b.config?.instruction || b.label;
      if (qText) {
        const explicitKey = b.config?.questionKey;
        if (explicitKey) {
          questionMap[explicitKey] = qText;
        }
        const baseKey = b.id;
        questionMap[baseKey] = qText;
        questionMap[`survey_${baseKey}`] = qText;
        questionMap[`mcq_${baseKey}`] = qText;
        questionMap[`brs_${baseKey}`] = qText;
        questionMap[`ux_${baseKey}`] = qText;
        questionMap[`rt_${baseKey}`] = qText;
      }
    }
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  async function viewResponses(sessionId: string) {
    if (selectedSessionId === sessionId) {
      setSelectedSessionId(null);
      return;
    }

    setSelectedSessionId(sessionId);
    setIsLoading(true);
    try {
      // Find the session in the sessions list to get metadata
      const s = sessions.find(sess => sess.id === sessionId);
      
      const res = await fetch(`/api/admin/export?studyId=${studyId}`);
      const data = await res.json();
      const sessionData = data.rows.find((r: any) => r.ParticipantID === sessionId);
      
      // Build metadata list
      const meta = [
        { key: "Browser", value: s?.browser || "unknown" },
        { key: "OS", value: s?.os || "unknown" },
        { key: "Device", value: s?.device || "unknown" },
        { key: "IP Address", value: s?.ip_address || "unknown" },
        { key: "Language", value: s?.locale || "unknown" },
      ];
      
      // Convert wide row back to key-value pairs for display
      const kv = Object.entries(sessionData || {})
        .filter(([key]) => !['ParticipantID', 'StartedAt', 'CompletedAt', 'Status', 'Device', 'Locale'].includes(key))
        .map(([key, value]) => ({ 
          key: questionMap[key] || key.replace(/_/g, ' '), 
          value 
        }));
        
      setResponses([...meta, ...kv]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <article className="rounded-xl border border-white/15 bg-white/5 overflow-hidden">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <User className="w-4 h-4 text-[var(--brand)]" />
          Recent Participants
        </h2>
        <span className="text-[10px] uppercase tracking-widest text-white/30">Last 50 sessions</span>
      </div>
      
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
                <tr className="hover:bg-white/5 transition-colors group">
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
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      s.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {s.status === 'completed' ? <CheckCircle className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/40">{s.device || 'unknown'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => viewResponses(s.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
                    >
                      <FileText className="w-3 h-3" />
                      {selectedSessionId === s.id ? 'Hide' : 'Inspect'}
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
                                <p className="text-[10px] uppercase tracking-tighter text-white/30">{r.key.replace(/_/g, ' ')}</p>
                                <p className="text-sm font-medium text-white">{String(r.value)}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-white/30 italic">No detailed responses recorded for this session.</p>
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
