import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserId } from "@/lib/supabase/server";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 500 });

  const { data: membership } = await admin
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (!membership) return NextResponse.json({ studies: [] });

  const { data: projects } = await admin
    .from("projects")
    .select("id")
    .eq("organization_id", membership.organization_id);

  const projectIds = (projects ?? []).map((p) => p.id);
  if (!projectIds.length) return NextResponse.json({ studies: [] });

  const { data: studies } = await admin
    .from("studies")
    .select("id,public_id,title,status,created_at")
    .in("project_id", projectIds)
    .order("created_at", { ascending: false });

  return NextResponse.json({ studies: studies ?? [] });
}
