
"use client";

import { useState } from "react";
import { Power, Play, Pause, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function StatusToggle({ studyId, currentStatus }: { studyId: string; currentStatus: string }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  async function toggleStatus() {
    const newStatus = currentStatus === "published" ? "completed" : "published";
    if (!confirm(`Are you sure you want to ${newStatus === 'published' ? 'start' : 'stop'} the study?`)) return;

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/studies/${studyId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        alert("Failed to update status");
      }
    } catch (err) {
      alert("Network error");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <article className="rounded-xl border border-white/15 bg-white/5 p-4 flex flex-col gap-3">
      <p className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">Study Control</p>
      <button
        onClick={toggleStatus}
        disabled={isUpdating}
        className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
          currentStatus === "published"
            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20"
            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
        }`}
      >
        {isUpdating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : currentStatus === "published" ? (
          <>
            <Pause className="w-4 h-4 fill-current" />
            Stop Study
          </>
        ) : (
          <>
            <Play className="w-4 h-4 fill-current" />
            Go Live
          </>
        )}
      </button>
      <p className="text-[10px] text-[var(--muted)] text-center">
        Status: <span className="uppercase font-bold text-white/60">{currentStatus}</span>
      </p>
    </article>
  );
}
