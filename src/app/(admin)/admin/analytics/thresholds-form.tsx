"use client";

import { useState } from "react";

type Thresholds = {
  fastTrialRtMs: number;
  fastTrialRateThreshold: number;
  errorRateThreshold: number;
  minTrialCount: number;
  exclusionRtLowerMs: number;
  exclusionRtUpperMs: number;
  errorPenaltyMs: number;
};

type HistoryItem = {
  id: string;
  changed_at: string;
  preset_name: string | null;
  actor_user_id: string | null;
  old_thresholds: Record<string, unknown>;
  new_thresholds: Record<string, unknown>;
};

const PRESETS: Record<string, Thresholds> = {
  Lenient: {
    fastTrialRtMs: 250,
    fastTrialRateThreshold: 0.2,
    errorRateThreshold: 0.4,
    minTrialCount: 10,
    exclusionRtLowerMs: 250,
    exclusionRtUpperMs: 3500,
    errorPenaltyMs: 400,
  },
  Standard: {
    fastTrialRtMs: 300,
    fastTrialRateThreshold: 0.1,
    errorRateThreshold: 0.3,
    minTrialCount: 12,
    exclusionRtLowerMs: 300,
    exclusionRtUpperMs: 3000,
    errorPenaltyMs: 600,
  },
  Strict_IRB: {
    fastTrialRtMs: 350,
    fastTrialRateThreshold: 0.05,
    errorRateThreshold: 0.25,
    minTrialCount: 16,
    exclusionRtLowerMs: 350,
    exclusionRtUpperMs: 2500,
    errorPenaltyMs: 700,
  },
};

export function ThresholdsForm({
  studyId,
  initial,
  history,
}: {
  studyId: string;
  initial: Thresholds;
  history: HistoryItem[];
}) {
  const [state, setState] = useState<Thresholds>(initial);
  const [msg, setMsg] = useState("");
  const [lastPreset, setLastPreset] = useState<string | null>(null);

  function update<K extends keyof Thresholds>(key: K, value: string) {
    const n = Number(value);
    setState((prev) => ({ ...prev, [key]: Number.isFinite(n) ? n : prev[key] }));
  }

  async function save() {
    setMsg("Saving...");
    const res = await fetch("/api/admin/studies/thresholds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studyId, iatThresholds: state, presetName: lastPreset }),
    });
    if (!res.ok) {
      const d = (await res.json()) as { error?: string };
      setMsg(d.error ?? "Save failed.");
      return;
    }
    setMsg("Saved thresholds.");
  }

  function applyPreset(name: string) {
    setState(PRESETS[name]);
    setLastPreset(name);
    setMsg(`Applied preset: ${name}. Save to persist.`);
  }

  return (
    <div className="grid gap-2 rounded-xl border border-white/15 bg-white/5 p-4 text-xs">
      <p className="text-sm font-medium">IAT Thresholds (per study)</p>
      <div className="flex flex-wrap gap-2">
        {Object.keys(PRESETS).map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => applyPreset(preset)}
            className="rounded border border-white/20 px-2 py-1"
          >
            {preset}
          </button>
        ))}
      </div>
      <label>
        Fast trial RT cutoff (ms)
        <input className="mt-1 w-full rounded border border-white/20 bg-transparent p-1" value={state.fastTrialRtMs} onChange={(e) => update("fastTrialRtMs", e.target.value)} />
      </label>
      <label>
        Fast trial rate threshold (ratio)
        <input className="mt-1 w-full rounded border border-white/20 bg-transparent p-1" value={state.fastTrialRateThreshold} onChange={(e) => update("fastTrialRateThreshold", e.target.value)} />
      </label>
      <label>
        Error rate threshold (ratio)
        <input className="mt-1 w-full rounded border border-white/20 bg-transparent p-1" value={state.errorRateThreshold} onChange={(e) => update("errorRateThreshold", e.target.value)} />
      </label>
      <label>
        Minimum trial count
        <input className="mt-1 w-full rounded border border-white/20 bg-transparent p-1" value={state.minTrialCount} onChange={(e) => update("minTrialCount", e.target.value)} />
      </label>
      <label>
        Exclusion lower RT bound (ms)
        <input className="mt-1 w-full rounded border border-white/20 bg-transparent p-1" value={state.exclusionRtLowerMs} onChange={(e) => update("exclusionRtLowerMs", e.target.value)} />
      </label>
      <label>
        Exclusion upper RT bound (ms)
        <input className="mt-1 w-full rounded border border-white/20 bg-transparent p-1" value={state.exclusionRtUpperMs} onChange={(e) => update("exclusionRtUpperMs", e.target.value)} />
      </label>
      <label>
        Error penalty (ms)
        <input className="mt-1 w-full rounded border border-white/20 bg-transparent p-1" value={state.errorPenaltyMs} onChange={(e) => update("errorPenaltyMs", e.target.value)} />
      </label>
      <button type="button" onClick={save} className="mt-2 rounded bg-[var(--brand-strong)] px-2 py-1 text-white">
        Save thresholds
      </button>
      {msg ? <p className="text-[var(--muted)]">{msg}</p> : null}
      <div className="mt-3 rounded-lg border border-white/10 p-2">
        <p className="mb-2 text-sm font-medium">Threshold Change History</p>
        <div className="grid gap-2">
          {history.map((item) => (
            <div key={item.id} className="rounded border border-white/10 p-2">
              <p>
                {new Date(item.changed_at).toLocaleString()} | preset: {item.preset_name ?? "custom"} | actor:{" "}
                {item.actor_user_id ?? "unknown"}
              </p>
            </div>
          ))}
          {!history.length ? <p className="text-[var(--muted)]">No threshold changes recorded yet.</p> : null}
        </div>
      </div>
    </div>
  );
}
