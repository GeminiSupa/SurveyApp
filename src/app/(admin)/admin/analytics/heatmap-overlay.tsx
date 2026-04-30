"use client";

import { useEffect, useMemo, useState } from "react";

type Point = { x: number; y: number };

export function HeatmapOverlay({ imageUrl }: { imageUrl: string }) {
  const [points, setPoints] = useState<Point[]>([]);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/admin/heatmap?type=first_click");
      const data = (await res.json()) as { points?: Point[] };
      setPoints(Array.isArray(data.points) ? data.points : []);
    }
    void load();
  }, []);

  const density = useMemo(() => points.slice(-400), [points]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/15 bg-white/5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="heatmap" className="h-72 w-full object-cover" />
      <div className="pointer-events-none absolute inset-0">
        {density.map((p, idx) => (
          <div
            key={idx}
            className="absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--brand)]/20 blur-md"
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
          />
        ))}
      </div>
      <div className="absolute bottom-2 left-2 rounded-lg bg-black/40 px-2 py-1 text-xs text-white">
        Points: {points.length}
      </div>
    </div>
  );
}
