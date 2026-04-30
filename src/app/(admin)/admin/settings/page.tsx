"use client";

import { useEffect, useState } from "react";
import { Building2, UserPlus, Trash2, Crown, Shield, User, Loader2 } from "lucide-react";

type Member = { id: string; user_id: string; email: string; role: string };
type Org = { id: string; name: string; slug: string };

const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner: <Crown className="w-3 h-3 text-amber-400" />,
  admin: <Shield className="w-3 h-3 text-blue-400" />,
  editor: <User className="w-3 h-3 text-emerald-400" />,
  analyst: <User className="w-3 h-3 text-purple-400" />,
  viewer: <User className="w-3 h-3 text-white/40" />,
};

export default function OrgSettingsPage() {
  const [org, setOrg] = useState<Org | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [myRole, setMyRole] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
   const [inviteRole, setInviteRole] = useState("editor");
   const [invitePassword, setInvitePassword] = useState("");
   const [resetUserId, setResetUserId] = useState<string | null>(null);
   const [resetPassword, setResetPassword] = useState("");
   const [myPassword, setMyPassword] = useState("");
   const [myConfirmPassword, setMyConfirmPassword] = useState("");
   const [message, setMessage] = useState<{ text: string; type: "ok" | "err" } | null>(null);
   const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/organization");
    const data = await res.json();
    setOrg(data.org ?? null);
    setMembers(data.members ?? []);
    setMyRole(data.myRole ?? "");
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const canManage = ["owner", "admin"].includes(myRole);

  async function inviteMember() {
    if (!inviteEmail.trim()) return;
    const res = await fetch("/api/admin/organization", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole, password: invitePassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage({ text: data.error, type: "err" });
    } else {
      setMessage({ text: `✓ ${data.addedEmail} added as ${data.role}${data.created ? " (account created)" : ""}.`, type: "ok" });
      setInviteEmail("");
      setInvitePassword("");
      void load();
    }
  }

  async function handleResetPassword() {
    if (!resetUserId || !resetPassword) return;
    const res = await fetch("/api/admin/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberUserId: resetUserId, password: resetPassword }),
    });
    if (res.ok) {
      setMessage({ text: "Password reset successfully.", type: "ok" });
      setResetUserId(null);
      setResetPassword("");
    } else {
      const data = await res.json();
      setMessage({ text: data.error, type: "err" });
    }
  }

  async function handleUpdateMyPassword() {
    if (!myPassword) return;
    if (myPassword !== myConfirmPassword) {
      setMessage({ text: "Passwords do not match.", type: "err" });
      return;
    }
    const res = await fetch("/api/admin/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberUserId: "me", password: myPassword }),
    });
    if (res.ok) {
      setMessage({ text: "Your password has been updated.", type: "ok" });
      setMyPassword("");
      setMyConfirmPassword("");
    } else {
      const data = await res.json();
      setMessage({ text: data.error, type: "err" });
    }
  }

  async function removeMember(memberId: string) {
    const res = await fetch("/api/admin/organization", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setMessage({ text: "Member removed.", type: "ok" });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="text-center py-16">
        <Building2 className="w-10 h-10 text-white/20 mx-auto mb-3" />
        <p className="text-white/40 text-sm">No organization found.</p>
        <a href="/admin/onboarding" className="mt-3 inline-block text-xs text-[var(--brand)] hover:underline">
          Create one →
        </a>
      </div>
    );
  }

  return (
    <section className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Organization Settings</h1>
        <p className="mt-1 text-sm text-white/40">Manage your team and access levels.</p>
      </div>

      {/* Org info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[var(--brand)]" />
            </div>
            <div>
              <p className="font-semibold text-white">{org.name}</p>
              <p className="text-xs text-white/30">{org.slug}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
           <div className="flex items-center justify-between mb-3">
             <div className="flex items-center gap-2">
               <User className="w-4 h-4 text-white/40" />
               <h2 className="text-sm font-semibold text-white">My Profile</h2>
             </div>
             <span className="text-[10px] uppercase tracking-widest text-white/20">{myRole}</span>
           </div>
           <div className="space-y-2">
             <input
               type="password"
               placeholder="New password"
               value={myPassword}
               onChange={(e) => setMyPassword(e.target.value)}
               className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-white"
             />
             <input
               type="password"
               placeholder="Confirm password"
               value={myConfirmPassword}
               onChange={(e) => setMyConfirmPassword(e.target.value)}
               className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-white"
             />
             <button
               onClick={handleUpdateMyPassword}
               disabled={!myPassword}
               className="w-full rounded-lg bg-white/5 hover:bg-white/10 py-1.5 text-xs font-medium text-white transition-all disabled:opacity-30"
             >
               Change My Password
             </button>
           </div>
        </div>
      </div>

      {/* Members list */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">
          Members ({members.length})
        </h2>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="space-y-2">
              <div
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/50 uppercase">
                    {m.email[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{m.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="flex items-center gap-1 text-xs text-white/50 px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                    {ROLE_ICONS[m.role]}
                    {m.role}
                  </span>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setResetUserId(m.user_id);
                          setResetPassword("");
                          setMessage(null);
                        }}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/20 hover:text-white transition-all"
                        title="Reset password"
                      >
                        <Shield className="w-3.5 h-3.5" />
                      </button>
                      {m.role !== "owner" && (
                        <button
                          onClick={() => removeMember(m.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-white/20 hover:text-rose-400 transition-all"
                          title="Remove member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {resetUserId === m.user_id && (
                <div className="flex gap-2 p-3 rounded-lg bg-black/40 border border-white/10 animate-in fade-in slide-in-from-top-1">
                  <input
                    autoFocus
                    type="password"
                    placeholder="New password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    className="flex-1 rounded-lg border border-white/10 bg-transparent px-3 py-1.5 text-xs text-white"
                  />
                  <button
                    onClick={handleResetPassword}
                    className="px-3 py-1.5 rounded-lg bg-[var(--brand)] text-xs font-semibold text-white"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setResetUserId(null)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-white/50"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Invite section */}
      {canManage && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <UserPlus className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Add Team Member</h2>
          </div>
          <p className="text-xs text-white/30">
            The person must already have an account. Ask them to sign up first.
          </p>
          <div className="grid gap-2">
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@university.edu"
              className="rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[var(--brand)] transition-colors"
            />
            <div className="flex gap-2">
              <input
                type="password"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
                placeholder="Temporary password"
                className="flex-1 rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[var(--brand)] transition-colors"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="rounded-xl border border-white/10 bg-[#091126] px-3 py-2 text-sm text-white"
              >
                <option value="editor">Editor</option>
                <option value="analyst">Analyst</option>
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <button
            onClick={inviteMember}
            disabled={!inviteEmail.trim()}
            className="flex items-center gap-2 rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Add Member
          </button>

          {message && (
            <p className={`text-sm ${message.type === "ok" ? "text-emerald-400" : "text-rose-400"}`}>
              {message.text}
            </p>
          )}
        </div>
      )}

      {/* Role legend */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
        <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">Role Permissions</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-white/40">
          <div className="flex items-center gap-2"><Crown className="w-3 h-3 text-amber-400" /> Owner — full control</div>
          <div className="flex items-center gap-2"><Shield className="w-3 h-3 text-blue-400" /> Admin — manage members</div>
          <div className="flex items-center gap-2"><User className="w-3 h-3 text-emerald-400" /> Editor — edit studies</div>
          <div className="flex items-center gap-2"><User className="w-3 h-3 text-purple-400" /> Analyst — view analytics</div>
          <div className="flex items-center gap-2"><User className="w-3 h-3 text-white/30" /> Viewer — read-only</div>
        </div>
      </div>
    </section>
  );
}
