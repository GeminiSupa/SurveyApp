"use client";
import { useEffect, useState } from "react";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { Copy, Link2, QrCode, ExternalLink } from "lucide-react";

type Study = { id: string; public_id: string; title: string; status: string };

export default function PublishPage() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/admin/my-studies");
      if (res.ok) {
        const data = await res.json();
        setStudies(data.studies ?? []);
      }
    }
    void load();
  }, []);

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Publish & Share</h1>
        <p className="mt-1 text-sm text-white/40">Copy participant links or open your studies directly.</p>
      </div>

      {!studies.length ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
          <Link2 className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/40 text-sm">No studies published yet.</p>
          <a href="/admin/lab" className="mt-3 inline-block text-xs text-[var(--brand)] hover:underline">
            Go to Lab Builder →
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {studies.map((study) => {
            const url = `${origin}/participant/${study.public_id}`;
            return (
              <div
                key={study.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate">{study.title}</p>
                  <p className="text-xs text-white/30 truncate mt-0.5">{url}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    study.status === "published" ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-white/30"
                  }`}>
                    {study.status}
                  </span>
                  <button
                    onClick={() => copy(url, study.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/60 hover:text-white transition-all"
                  >
                    <Copy className="w-3 h-3" />
                    {copied === study.id ? "Copied!" : "Copy Link"}
                  </button>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--brand)]/10 hover:bg-[var(--brand)]/20 text-xs text-[var(--brand)] transition-all"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
