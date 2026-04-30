import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserId } from "@/lib/supabase/server";
import Link from "next/link";
import { FlaskConical, Users, BarChart3, AlertTriangle, ArrowRight, Plus, Trash2, Edit } from "lucide-react";
import { StudyActions } from "@/app/(admin)/admin/dashboard/study-actions";

async function getDashboardMetrics(userId: string, filterStatus?: string) {
  const admin = createAdminSupabaseClient();
  if (!admin) return { cards: [], studies: [], alerts: [] };

  const todayIso = new Date();
  todayIso.setHours(0, 0, 0, 0);

  // Get org for this user
  const { data: membership } = await admin
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (!membership) return { cards: [], studies: [], alerts: [] };

  const { data: projects } = await admin
    .from("projects")
    .select("id")
    .eq("organization_id", membership.organization_id);

  const projectIds = (projects ?? []).map((p) => p.id);

  if (!projectIds.length) return { cards: [], studies: [], alerts: [] };

  let query = admin.from("studies").select("id,public_id,title,status,created_at").in("project_id", projectIds).order("created_at", { ascending: false }).limit(6);
  
  if (filterStatus && filterStatus !== "all") {
    query = query.eq("status", filterStatus);
  }

  const [activeStudiesRes, responsesTodayRes, alertsRes, studiesRes] = await Promise.all([
    admin.from("studies").select("*", { count: "exact", head: true }).in("project_id", projectIds).eq("status", "published"),
    admin.from("responses").select("*", { count: "exact", head: true }).gte("created_at", todayIso.toISOString()),
    admin.from("friction_alerts").select("id,alert_type,severity,created_at").eq("resolved", false).order("created_at", { ascending: false }).limit(4),
    query,
  ]);

  return {
    cards: [
      { label: "Published Studies", value: String(activeStudiesRes.count ?? 0), color: "emerald" },
      { label: "Responses Today", value: String(responsesTodayRes.count ?? 0), color: "blue" },
      { label: "Friction Alerts", value: String(alertsRes.data?.length ?? 0), color: "amber" },
    ],
    studies: studiesRes.data ?? [],
    alerts: alertsRes.data ?? [],
  };
}

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return null;

  const { status: filterStatus } = await searchParams;
  const { cards, studies, alerts } = await getDashboardMetrics(userId, filterStatus);

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-white/40">Overview of your studies and participant activity.</p>
        </div>
        <Link
          href="/admin/lab"
          className="flex items-center gap-2 rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" />
          New Study
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.label}
            className={`rounded-2xl border p-5 ${
              card.color === "emerald"
                ? "border-emerald-500/20 bg-emerald-500/5"
                : card.color === "blue"
                  ? "border-blue-500/20 bg-blue-500/5"
                  : "border-amber-500/20 bg-amber-500/5"
            }`}
          >
            <p className="text-xs uppercase tracking-widest text-white/40">{card.label}</p>
            <p className={`mt-2 text-4xl font-bold ${
              card.color === "emerald" ? "text-emerald-400" : card.color === "blue" ? "text-blue-400" : "text-amber-400"
            }`}>{card.value}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Studies */}
        <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
              <FlaskConical className="w-4 h-4 text-[var(--brand)]" />
              Recent Studies
            </h2>
            <div className="flex items-center gap-2 rounded-lg bg-black/40 p-1">
              {["all", "published", "draft"].map((s) => (
                <Link
                  key={s}
                  href={`/admin/dashboard?status=${s}`}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                    (filterStatus || "all") === s 
                    ? "bg-[var(--brand)] text-white" 
                    : "text-white/40 hover:text-white/70"
                  }`}
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {studies.length ? (
              studies.map((study) => (
                <div key={study.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-3 py-2.5 group">
                  <div className="flex-1">
                    <Link href={`/admin/lab?id=${study.id}`} className="text-sm font-medium text-white hover:text-[var(--brand)] transition-colors">
                      {study.title}
                    </Link>
                    <p className="text-[10px] text-white/20 mt-0.5">/{study.public_id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      study.status === "published" ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-white/30"
                    }`}>
                      {study.status}
                    </span>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/admin/lab?id=${study.id}`}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-all"
                        title="Edit Study"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Link>
                      <Link
                        href={`/admin/analytics?studyId=${study.id}`}
                        className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-white/30 hover:text-emerald-400 transition-all"
                        title="View Analytics"
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                      </Link>
                      <StudyActions studyId={study.id} />
                      <Link
                        href={`/participant/${study.public_id}`}
                        target="_blank"
                        className="text-xs text-white/40 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-all ml-1"
                      >
                        Open ↗
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-white/30 text-sm">No studies yet.</p>
                <Link href="/admin/lab" className="mt-2 inline-block text-xs text-[var(--brand)] hover:underline">
                  Create your first study →
                </Link>
              </div>
            )}
          </div>
        </article>

        {/* Friction Alerts */}
        <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">Friction Alerts</h2>
          </div>
          <div className="space-y-2">
            {alerts.length ? (
              alerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 rounded-xl border border-amber-500/10 bg-amber-500/5 px-3 py-2.5">
                  <span className={`mt-0.5 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    alert.severity === "high" ? "bg-rose-500/20 text-rose-400" :
                    alert.severity === "medium" ? "bg-amber-500/20 text-amber-400" : "bg-white/10 text-white/40"
                  }`}>{alert.severity}</span>
                  <p className="text-xs text-white/60">{alert.alert_type}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-white/30 text-sm">No active alerts.</p>
                <p className="text-white/20 text-xs mt-1">Great participant flow quality!</p>
              </div>
            )}
          </div>
        </article>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { href: "/admin/lab", label: "Lab Builder", desc: "Create & configure studies", icon: FlaskConical, color: "blue" },
          { href: "/admin/audience", label: "Audience", desc: "Manage participants", icon: Users, color: "purple" },
          { href: "/admin/analytics", label: "Analytics", desc: "View & export data", icon: BarChart3, color: "emerald" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 hover:border-white/20 transition-all group"
          >
            <item.icon className={`w-5 h-5 ${item.color === "blue" ? "text-blue-400" : item.color === "purple" ? "text-purple-400" : "text-emerald-400"}`} />
            <div>
              <p className="text-sm font-medium text-white group-hover:text-white">{item.label}</p>
              <p className="text-xs text-white/30">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
