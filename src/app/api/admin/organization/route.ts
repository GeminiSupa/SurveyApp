import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserId } from "@/lib/supabase/server";

/** GET /api/admin/organization — return current org + members */
export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 500 });

  const { data: membership } = await admin
    .from("organization_memberships")
    .select("organization_id, role")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (!membership) return NextResponse.json({ org: null, members: [] });

  const [{ data: org }, { data: members }] = await Promise.all([
    admin.from("organizations").select("id, name, slug").eq("id", membership.organization_id).single(),
    admin
      .from("organization_memberships")
      .select("id, user_id, role")
      .eq("organization_id", membership.organization_id),
  ]);

  // Fetch emails for all members
  const enriched = await Promise.all(
    (members ?? []).map(async (m) => {
      const { data: u } = await admin.auth.admin.getUserById(m.user_id);
      return { ...m, email: u?.user?.email ?? "unknown" };
    })
  );

  return NextResponse.json({
    org,
    myRole: membership.role,
    members: enriched,
  });
}

/** POST /api/admin/organization — add or create a user by email */
export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 500 });

  const { email, role = "editor", password } = (await request.json()) as { email?: string; role?: string; password?: string };
  if (!email?.trim()) return NextResponse.json({ error: "Email is required." }, { status: 400 });

  // Verify inviter is owner or admin
  const { data: inviterMembership } = await admin
    .from("organization_memberships")
    .select("organization_id, role")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (!inviterMembership || !["owner", "admin"].includes(inviterMembership.role)) {
    return NextResponse.json({ error: "Only owners and admins can add members." }, { status: 403 });
  }

  // Look up the user
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
  let targetUser = users?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase().trim());

  // If user doesn't exist, create them if a password is provided
  if (!targetUser) {
    if (!password) {
      return NextResponse.json({
        error: `No account found for "${email}". Please provide a temporary password to create their account.`,
      }, { status: 400 });
    }

    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true
    });

    if (createErr || !newUser.user) {
      return NextResponse.json({ error: `User creation failed: ${createErr?.message}` }, { status: 500 });
    }
    targetUser = newUser.user;
  }

  // Check if already a member
  const { data: existing } = await admin
    .from("organization_memberships")
    .select("id")
    .eq("organization_id", inviterMembership.organization_id)
    .eq("user_id", targetUser.id)
    .single();

  if (existing) return NextResponse.json({ error: "This user is already a member." }, { status: 409 });

  const { error } = await admin.from("organization_memberships").insert({
    organization_id: inviterMembership.organization_id,
    user_id: targetUser.id,
    role,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, addedEmail: email, role, created: !targetUser });
}

/** PATCH /api/admin/organization — update a member (e.g. change password) */
export async function PATCH(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 500 });

  const { memberUserId, password } = (await request.json()) as { memberUserId?: string; password?: string };
  if (!memberUserId || !password) return NextResponse.json({ error: "memberUserId and password required." }, { status: 400 });

  const targetId = memberUserId === "me" ? userId : memberUserId;

  // Verify requester is owner or admin (unless they are updating themselves)
  const { data: myMembership } = await admin
    .from("organization_memberships")
    .select("organization_id, role")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (targetId !== userId) {
    if (!myMembership || !["owner", "admin"].includes(myMembership.role)) {
      return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
    }

    // Verify target is in the same org
    const { data: targetMembership } = await admin
      .from("organization_memberships")
      .select("id")
      .eq("organization_id", myMembership.organization_id)
      .eq("user_id", targetId)
      .single();

    if (!targetMembership) return NextResponse.json({ error: "User not found in your organization." }, { status: 404 });
  }

  // Update password
  const { error } = await admin.auth.admin.updateUserById(targetId, { password });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, message: "Password updated successfully." });
}

/** DELETE /api/admin/organization — remove a member */
export async function DELETE(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 500 });

  const { memberId } = (await request.json()) as { memberId?: string };
  if (!memberId) return NextResponse.json({ error: "memberId required." }, { status: 400 });

  const { data: myMembership } = await admin
    .from("organization_memberships")
    .select("organization_id, role")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (!myMembership || !["owner", "admin"].includes(myMembership.role)) {
    return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
  }

  await admin
    .from("organization_memberships")
    .delete()
    .eq("id", memberId)
    .eq("organization_id", myMembership.organization_id);

  return NextResponse.json({ ok: true });
}
