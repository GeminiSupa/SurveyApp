"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ArrowRight, Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!orgName.trim()) {
      setMessage("Please enter a name for your lab or organization.");
      return;
    }
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/admin/organization/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: orgName.trim() }),
    });

    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Could not create organization.");
      setLoading(false);
      return;
    }

    router.push("/admin/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#030711] p-4">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-[var(--brand)]/10 border border-[var(--brand)]/20 flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-[var(--brand)]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome! Set Up Your Lab</h1>
          <p className="mt-2 text-sm text-white/40">
            Create your research organization. You can invite team members after.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">
              Organization / Lab Name
            </label>
            <input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="w-full rounded-xl border border-white/10 bg-transparent px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[var(--brand)] transition-colors"
              placeholder="e.g. Behavioral Research Lab, UX Team..."
              autoFocus
            />
          </div>

          {message && (
            <p className="text-sm text-rose-400">{message}</p>
          )}

          <button
            onClick={handleCreate}
            disabled={loading || !orgName.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Create Organization
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        <p className="text-center text-xs text-white/20 mt-4">
          You'll be set as the Owner. You can invite collaborators from Settings.
        </p>
      </div>
    </div>
  );
}
