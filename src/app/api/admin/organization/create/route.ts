import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserId } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 500 });

  // Check if already has an org
  const { data: existing } = await admin
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (existing) {
    return NextResponse.json({ error: "You already belong to an organization." }, { status: 409 });
  }

  const { name } = (await request.json()) as { name?: string };
  if (!name?.trim()) {
    return NextResponse.json({ error: "Organization name is required." }, { status: 400 });
  }

  const slug =
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 36) +
    `-${Date.now()}`;

  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({ name: name.trim(), slug })
    .select("id, name")
    .single();

  if (orgErr || !org) {
    console.error("Org create error:", orgErr);
    return NextResponse.json({ error: "Could not create organization." }, { status: 500 });
  }

  const { error: memberErr } = await admin
    .from("organization_memberships")
    .insert({ organization_id: org.id, user_id: userId, role: "owner" });

  if (memberErr) {
    console.error("Membership error:", memberErr);
    return NextResponse.json({ error: "Organization created but membership failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, organizationId: org.id, name: org.name });
}
