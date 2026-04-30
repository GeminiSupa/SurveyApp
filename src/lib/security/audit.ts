import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type AuditEvent = {
  route: string;
  action: string;
  outcome: "success" | "blocked" | "error";
  actorUserId?: string | null;
  ip?: string | null;
  details?: Record<string, unknown>;
};

export async function writeAuditLog(event: AuditEvent) {
  const payload = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  console.info(JSON.stringify({ type: "audit", ...payload }));

  const admin = createAdminSupabaseClient();
  if (!admin) return;

  await admin.from("security_audit_logs").insert({
    route: event.route,
    action: event.action,
    outcome: event.outcome,
    actor_user_id: event.actorUserId ?? null,
    ip_address: event.ip ?? null,
    details: event.details ?? {},
  });
}
