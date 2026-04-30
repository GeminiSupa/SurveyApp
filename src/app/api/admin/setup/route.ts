import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserId } from "@/lib/supabase/server";

/**
 * POST /api/admin/setup
 * Auto-provisions a default Organization + Membership for the logged-in user
 * if one does not already exist. Safe to call multiple times (idempotent).
 */
export async function POST() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  if (!admin) {
    return NextResponse.json({ error: "Admin client unavailable." }, { status: 500 });
  }

  // Check if the user already has a membership
  const { data: existing } = await admin
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (existing?.organization_id) {
    return NextResponse.json({ ok: true, organizationId: existing.organization_id, created: false });
  }

  // Get user email for the org name
  const { data: userRecord } = await admin.auth.admin.getUserById(userId);
  const email = userRecord?.user?.email ?? "researcher";
  const orgName = `${email.split("@")[0]}'s Lab`;
  const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) + `-${Date.now()}`;

  // Create organization
  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({ name: orgName, slug })
    .select("id")
    .single();

  if (orgErr || !org) {
    console.error("Setup: org creation failed", orgErr);
    return NextResponse.json({ error: "Could not create organization." }, { status: 500 });
  }

  // Create membership as owner
  const { error: memberErr } = await admin
    .from("organization_memberships")
    .insert({ organization_id: org.id, user_id: userId, role: "owner" });

  if (memberErr) {
    console.error("Setup: membership creation failed", memberErr);
    return NextResponse.json({ error: "Could not create membership." }, { status: 500 });
  }

  console.log(`[Setup] Created org "${orgName}" for user ${userId}`);
  return NextResponse.json({ ok: true, organizationId: org.id, orgName, created: true });
}
