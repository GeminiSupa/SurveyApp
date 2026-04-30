"use client";

import { useEffect, useState } from "react";
import { createRequestId } from "@/lib/security/request-id";
import { Users, Link2, Copy, Check } from "lucide-react";

type Study = { id: string; public_id: string; title: string };

export function AudienceManager() {
  const [groupName, setGroupName] = useState("Study Group A");
  const [emails, setEmails] = useState("");
  const [message, setMessage] = useState("");
  const [magicLink, setMagicLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [studies, setStudies] = useState<Study[]>([]);
  const [selectedStudyId, setSelectedStudyId] = useState("");

  useEffect(() => {
    fetch("/api/admin/my-studies")
      .then((r) => r.json())
      .then((data) => {
        const list: Study[] = data.studies ?? [];
        setStudies(list);
        if (list.length) setSelectedStudyId(list[0].public_id);
      })
      .catch(() => {});
  }, []);

  async function importAudience() {
    setMessage("Importing...");
    const response = await fetch("/api/admin/audiences/import", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-request-id": createRequestId() },
      body: JSON.stringify({
        groupName,
        members: emails.split("\n").map((e) => e.trim()).filter(Boolean),
      }),
    });
    const payload = (await response.json()) as { error?: string; imported?: number };
    if (!response.ok) {
      setMessage(payload.error ?? "Import failed.");
      return;
    }
    setMessage(`✓ Imported ${payload.imported ?? 0} participants into "${groupName}".`);
  }

  async function createMagicLink() {
    if (!selectedStudyId) {
      setMessage("Please select a study first.");
      return;
    }
    const response = await fetch("/api/admin/publish/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-request-id": createRequestId() },
      body: JSON.stringify({ studyPublicId: selectedStudyId, groupName }),
    });
    const payload = (await response.json()) as { error?: string; url?: string };
    if (!response.ok || !payload.url) {
      setMessage(payload.error ?? "Could not create magic link.");
      return;
    }
    setMagicLink(payload.url);
  }

  function copyLink() {
    navigator.clipboard.writeText(magicLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Audience Manager</h1>
        <p className="mt-1 text-sm text-white/40">Import participants and generate magic study links.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Import Panel */}
        <article className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-[var(--brand)]" />
            <h2 className="text-sm font-semibold text-white">Import Participants</h2>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Group Name</label>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[var(--brand)] transition-colors"
              placeholder="e.g. Psychology 101 Cohort"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Email Addresses (one per line)</label>
            <textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              rows={6}
              className="w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[var(--brand)] transition-colors font-mono"
              placeholder={"student1@uni.edu\nstudent2@uni.edu\nstudent3@uni.edu"}
            />
          </div>
          <button
            type="button"
            onClick={importAudience}
            disabled={!emails.trim()}
            className="w-full rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Import Members
          </button>
        </article>

        {/* Magic Link Panel */}
        <article className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Link2 className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Generate Magic Link</h2>
          </div>
          <p className="text-xs text-white/40">
            Create a one-click participation link. Participants don't need an account — just open the link.
          </p>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Select Study</label>
            <select
              value={selectedStudyId}
              onChange={(e) => setSelectedStudyId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#091126] px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--brand)] transition-colors"
            >
              {studies.length === 0 && <option value="">No studies found</option>}
              {studies.map((s) => (
                <option key={s.public_id} value={s.public_id}>{s.title}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={createMagicLink}
            disabled={!selectedStudyId}
            className="w-full rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Generate Link
          </button>
          {magicLink && (
            <div className="mt-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <p className="text-xs text-emerald-300 break-all mb-2">{magicLink}</p>
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>
          )}
        </article>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
          message.startsWith("✓") ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300" : "bg-rose-500/10 border border-rose-500/20 text-rose-300"
        }`}>
          {message}
        </div>
      )}
    </section>
  );
}
