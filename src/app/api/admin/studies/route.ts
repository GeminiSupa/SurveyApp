import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserId } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/security/audit";
import { enforceRateLimit, enforceReplayProtection, getClientIp, requireTrustedOrigin } from "@/lib/security/request-guards";

type Payload = {
  title: string;
  studyType: "ux_research" | "psychology_study";
  blocks: Array<{ id?: string; blockType: string; label: string; config: Record<string, unknown>; sortOrder: number }>;
  logicRules?: Array<{ source_block_id: string; condition: Record<string, unknown>; target_block_id: string | null; terminate: boolean }>;
  disqualificationRules?: Array<{ condition: Record<string, unknown>; disqualify_message: string }>;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 30);
}

async function ensureOrgForUser(adminClient: ReturnType<typeof createAdminSupabaseClient>, userId: string) {
  if (!adminClient) return null;
  // Check existing membership
  const { data: existing } = await adminClient
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", userId)
    .limit(1)
    .single();
  if (existing?.organization_id) return existing.organization_id;

  // Auto-provision: get user email
  const { data: userRecord } = await adminClient.auth.admin.getUserById(userId);
  const email = userRecord?.user?.email ?? "researcher";
  const orgName = `${email.split("@")[0]}'s Lab`;
  const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 36) + `-${Date.now()}`;

  const { data: org, error: orgErr } = await adminClient
    .from("organizations")
    .insert({ name: orgName, slug })
    .select("id")
    .single();
  if (orgErr || !org) return null;

  await adminClient
    .from("organization_memberships")
    .insert({ organization_id: org.id, user_id: userId, role: "owner" });

  console.log(`[Studies] Auto-provisioned org "${orgName}" for user ${userId}`);
  return org.id;
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const originGuard = requireTrustedOrigin(request);
  if (!originGuard.ok) return originGuard.response;
  const rateGuard = enforceRateLimit(request, "admin-studies-create", 30, 60_000);
  if (!rateGuard.ok) return rateGuard.response;
  const replayGuard = await enforceReplayProtection(request, "/api/admin/studies");
  if (!replayGuard.ok) {
    console.warn(`[API] Replay protection blocked: ${request.headers.get("x-request-id")}`);
    return replayGuard.response;
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    await writeAuditLog({ route: "/api/admin/studies", action: "auth_check", outcome: "blocked", ip });
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = await createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  if (!supabase || !admin) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as Partial<Payload> | null;
  if (!body?.title || !body.studyType || !body.blocks?.length) {
    return NextResponse.json({ error: "Missing title, studyType, or blocks." }, { status: 400 });
  }

  // Use admin client to bypass RLS — auto-create org if needed
  const organizationId = await ensureOrgForUser(admin, userId);
  if (!organizationId) {
    return NextResponse.json({ error: "Could not provision organization for this account." }, { status: 500 });
  }

  // Get or create project using admin client
  const { data: project, error: projectError } = await admin
    .from("projects")
    .insert({ organization_id: organizationId, name: `${body.title} Project`, study_type: body.studyType })
    .select("id")
    .single();

  if (projectError || !project) {
    await writeAuditLog({ route: "/api/admin/studies", action: "project_create", outcome: "error", ip, actorUserId: userId });
    console.error("Project creation error:", projectError);
    return NextResponse.json({ error: `Could not create project: ${projectError?.message}` }, { status: 500 });
  }

  const basePublicId = slugify(body.title);
  const publicId = `${basePublicId || "study"}-${Math.floor(Math.random() * 10000)}`;

  const { data: study, error: studyError } = await admin
    .from("studies")
    .insert({
      project_id: project.id,
      title: body.title,
      public_id: publicId,
      status: body.status || "published",
      config: {
        iatThresholds: {
          fastTrialRtMs: 300,
          fastTrialRateThreshold: 0.1,
          errorRateThreshold: 0.3,
          minTrialCount: 12,
          exclusionRtLowerMs: 300,
          exclusionRtUpperMs: 3000,
          errorPenaltyMs: 600,
        },
      },
    })
    .select("id, public_id")
    .single();

  if (studyError || !study) {
    await writeAuditLog({ route: "/api/admin/studies", action: "study_create", outcome: "error", ip, actorUserId: userId });
    console.error("Study creation error:", studyError);
    return NextResponse.json({ error: `Could not create study: ${studyError?.message}` }, { status: 500 });
  }

  const insertBlocks = body.blocks.map((block) => ({
    id: block.id || crypto.randomUUID(),
    study_id: study.id,
    block_type: block.blockType,
    label: block.label,
    sort_order: block.sortOrder,
    config: block.config,
  }));

  const { error: blocksError } = await admin.from("study_blocks").insert(insertBlocks);
  if (blocksError) {
    console.error("Block insertion error:", blocksError);
    await writeAuditLog({ route: "/api/admin/studies", action: "block_create", outcome: "error", ip, actorUserId: userId });
    return NextResponse.json({ error: `Block insertion failed: ${blocksError.message}` }, { status: 500 });
  }

  if (body.logicRules?.length) {
    const rules = body.logicRules.map(r => ({ ...r, study_id: study.id }));
    const { error: logicError } = await admin.from("logic_rules").insert(rules);
    if (logicError) {
      console.error("Logic rules error:", logicError);
      return NextResponse.json({ error: `Logic rules failed: ${logicError.message}` }, { status: 500 });
    }
  }

  if (body.disqualificationRules?.length) {
    const rules = body.disqualificationRules.map(r => ({ ...r, study_id: study.id }));
    const { error: dqError } = await admin.from("disqualification_rules").insert(rules);
    if (dqError) {
      console.error("Disqualification rules error:", dqError);
      return NextResponse.json({ error: `Disqualification rules failed: ${dqError.message}` }, { status: 500 });
    }
  }

  await writeAuditLog({ route: "/api/admin/studies", action: "study_create", outcome: "success", ip, actorUserId: userId });
  return NextResponse.json({ ok: true, id: study.id, publicId: study.public_id });
}
