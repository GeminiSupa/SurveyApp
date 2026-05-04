"use client";

import React from "react";

export type ResultTone = "emerald" | "amber" | "rose" | "violet" | "blue";

export function ResultCard({
  title,
  subtitle,
  tone = "blue",
  children,
}: {
  title: string;
  subtitle?: string;
  tone?: ResultTone;
  children: React.ReactNode;
}) {
  return (
    <article className="glass-panel rounded-3xl p-5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
          {subtitle ? <p className="mt-2 text-sm text-[var(--muted)]">{subtitle}</p> : null}
        </div>
        <span className={`band-chip band-${tone}`}>Results</span>
      </div>
      <div className="mt-6">{children}</div>
    </article>
  );
}

